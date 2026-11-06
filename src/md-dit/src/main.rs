// no console window next to the app when started by double click on Windows
#![cfg_attr(windows, windows_subsystem = "windows")]

mod highlight;
mod render;
mod svg;
mod toc;
mod view;

use std::{
    cell::{Cell, RefCell},
    collections::VecDeque,
    env, fs,
    path::{Path, PathBuf},
    process,
    rc::Rc,
    time::{Duration, SystemTime},
};

use adw::prelude::*;
use gdk::gdk_pixbuf::Pixbuf;
use gtk::{gdk, gio, glib};
use pulldown_cmark::Alignment;
use render::{ImageSource, PendingCode, PendingImage, PendingTable, Renderer};
use toc::{Toc, DEFAULT_WIDTH, RAIL_WIDTH};
use view::{Decorations, MdView};

const COLUMN_WIDTH: f64 = 860.0;
/// the reading column widths the sidebar button cycles through, with the icon, the label and the tooltip of each, the last one fills the window
const WIDTH_MODES: [(f64, &str, &str, &str); 3] = [
    (
        COLUMN_WIDTH,
        "format-justify-center-symbolic",
        "Small width",
        "Small width, click for large width",
    ),
    (
        1200.0,
        "format-justify-fill-symbolic",
        "Large width",
        "Large width, click for full width",
    ),
    (
        f64::INFINITY,
        "view-fullscreen-symbolic",
        "Full width",
        "Full width, click for small width",
    ),
];
/// the icon, the label and the tooltip of the theme button for the current theme
fn theme_button_content(dark: bool) -> (&'static str, &'static str, &'static str) {
    if dark {
        (
            "weather-clear-night-symbolic",
            "Dark theme",
            "Dark theme, click for light theme",
        )
    } else {
        (
            "weather-clear-symbolic",
            "Light theme",
            "Light theme, click for dark theme",
        )
    }
}
const MIN_MARGIN: f64 = 24.0;
/// reading column of the default 900 px window
const DEFAULT_COLUMN: i32 = 852;
/// how long a code block takes to fold or unfold, in milliseconds
const FOLD_MS: f64 = 200.0;
const MIN_TOC_HEADINGS: usize = 3;
/// width of the draggable strip next to the open sidebar
const HANDLE_WIDTH: i32 = 6;
/// a heading counts as current once it is this far (px) from the top of the window
const ACTIVE_OFFSET: f64 = 140.0;
/// space kept above a heading the sidebar scrolled to, in px
const HEADING_PADDING: i32 = 32;
const POLL_INTERVAL: Duration = Duration::from_millis(40);
/// the file is checked every this many polls
const RELOAD_EVERY: u32 = 6;

struct App {
    file: PathBuf,
    buffer: gtk::TextBuffer,
    view: MdView,
    scrolled: gtk::ScrolledWindow,
    window: gtk::ApplicationWindow,
    /// holds the whole window, a code block shown in full screen lands on top of it
    overlay: gtk::Overlay,
    /// floats over the bottom of the window, shows the link under the pointer and nothing else
    status: gtk::Label,
    modal: RefCell<Option<gtk::Widget>>,
    /// the header of each code block, as wide as the reading column
    code_heads: RefCell<Vec<gtk::Box>>,
    toc: Rc<Toc>,
    renderer: RefCell<Renderer>,
    toc_built: Cell<usize>,
    /// the strip between the sidebar and the document that resizes the sidebar, only there when it is open
    handle: gtk::Box,
    layout: gtk::Box,
    /// Some once the user opened or collapsed the sidebar, resizing the window then never changes it again
    user_choice: Cell<Option<bool>>,
    /// width of the open sidebar, what the user dragged it to
    expanded_width: Cell<i32>,
    loaded: Cell<bool>,
    generation: Cell<u32>,
    restore_scroll: Cell<Option<f64>>,
    smooth: SmoothScroll,
    /// the heading picked in the sidebar, kept highlighted while the page is still going there and until the user scrolls away,
    /// the page position settles in the second field once the jump is over
    pinned: Cell<Option<(usize, Option<f64>)>>,
    images: RefCell<VecDeque<PendingImage>>,
    /// each table with its natural width, it is as wide as that unless the reading column is narrower
    tables: RefCell<Vec<(gtk::ScrolledWindow, i32)>>,
    /// width of the reading column in px, tables are exactly that wide and scroll inside it
    column_width: Cell<i32>,
    /// index in WIDTH_MODES of the reading width the user picked
    width_mode: Cell<usize>,
    /// each placed picture with its height / width ratio and its natural width (none for a scalable svg),
    /// it is as wide as the reading column but never above its natural width
    pictures: RefCell<Vec<(gtk::Picture, f64, Option<i32>)>>,
    placing_images: Cell<bool>,
    modified: Cell<Option<SystemTime>>,
    exit_head: bool,
    exit_full: bool,
}

/// slides the page to where the wheel asked instead of jumping there, clicks in a row add up
struct SmoothScroll {
    adjustment: gtk::Adjustment,
    animation: adw::TimedAnimation,
    target: Cell<f64>,
}

impl SmoothScroll {
    fn new(scrolled: &gtk::ScrolledWindow) -> Self {
        let adjustment = scrolled.vadjustment();
        let moved = adjustment.clone();
        let animation = adw::TimedAnimation::builder()
            .widget(scrolled)
            .value_from(0.0)
            .value_to(0.0)
            .duration(200)
            .easing(adw::Easing::EaseOutCubic)
            .target(&adw::CallbackAnimationTarget::new(move |value| {
                moved.set_value(value)
            }))
            .build();
        Self {
            adjustment,
            animation,
            target: Cell::new(0.0),
        }
    }

    fn scroll_by(&self, delta: f64) {
        let playing = self.animation.state() == adw::AnimationState::Playing;
        let from = self.adjustment.value();
        let base = if playing { self.target.get() } else { from };
        let end = (self.adjustment.upper() - self.adjustment.page_size()).max(0.0);
        let target = (base + delta).clamp(0.0, end);
        self.target.set(target);
        // resetting applies value_from, which is where the page is now, so it does not jump
        self.animation.set_value_from(from);
        self.animation.reset();
        self.animation.set_value_to(target);
        self.animation.play();
    }
}

/// wheel clicks scroll smoothly, a touchpad already moves the page continuously and keeps its own handling
fn smooth_wheel(app: &Rc<App>) {
    let smoothing = app.clone();
    let wheel = gtk::EventControllerScroll::new(gtk::EventControllerScrollFlags::BOTH_AXES);
    wheel.set_propagation_phase(gtk::PropagationPhase::Capture);
    wheel.connect_scroll(move |controller, dx, dy| {
        if controller.unit() != gdk::ScrollUnit::Wheel
            || dy.abs() <= dx.abs()
            || controller
                .current_event_state()
                .contains(gdk::ModifierType::SHIFT_MASK)
        {
            return glib::Propagation::Proceed;
        }
        let page = smoothing.smooth.adjustment.page_size();
        smoothing.smooth.scroll_by(dy * page.powf(2.0 / 3.0));
        glib::Propagation::Stop
    });
    app.scrolled.add_controller(wheel);
}

fn fail(message: String) -> ! {
    eprintln!("md-dit-gtk: {message}");
    process::exit(1);
}

fn modified(file: &Path) -> Option<SystemTime> {
    fs::metadata(file).and_then(|m| m.modified()).ok()
}

fn css(dark: bool) -> String {
    let (text, muted, sidebar, border, hover, active, accent) = if dark {
        (
            "#c9d1d9",
            "#8b949e",
            "#14171b",
            "#2a2f36",
            "rgba(255,255,255,0.05)",
            "rgba(88,166,255,0.20)",
            "#58a6ff",
        )
    } else {
        (
            "#24292f",
            "#656d76",
            "#f6f8fa",
            "#d0d7de",
            "rgba(0,0,0,0.05)",
            "rgba(9,105,218,0.12)",
            "#0969da",
        )
    };
    let (heading, table_bg, table_border, head_bg, zebra) = if dark {
        (
            "#f0f6fc",
            "#171b21",
            "#30363d",
            "rgba(255,255,255,0.07)",
            "rgba(255,255,255,0.03)",
        )
    } else {
        (
            "#1f2328",
            "#ffffff",
            "#d0d7de",
            "rgba(0,0,0,0.05)",
            "rgba(0,0,0,0.025)",
        )
    };
    let (code_bg, code_head, code_border, scrim) = if dark {
        (
            "#202833",
            "rgba(255,255,255,0.05)",
            "rgba(255,255,255,0.14)",
            "rgba(0,0,0,0.6)",
        )
    } else {
        (
            "#f2f4f6",
            "rgba(0,0,0,0.04)",
            "rgba(0,0,0,0.14)",
            "rgba(0,0,0,0.4)",
        )
    };
    // the GTK theme can be a dark one that libadwaita does not restyle (ZorinBlue-Dark), so a light scheme paints its own
    // backgrounds, the dark scheme keeps the ones of the system theme
    let page = if dark {
        String::new()
    } else {
        format!(
            "window, window.background, headerbar {{ background: #ffffff; color: {text}; }}
             headerbar button, headerbar windowcontrols button {{ color: {text}; }}
             textview, textview text {{ background: #ffffff; }}
             "
        )
    };
    format!(
        "{page}textview, textview text {{ font-size: 14px; color: {text}; }}
         .sidebar:not(.toc-rail) {{ padding-bottom: 10px; }}
         .sidebar {{ background: {sidebar}; border-right: 1px solid {border}; }}
         .toc-header {{ font-size: 11px; font-weight: 600; letter-spacing: 1px; color: {muted}; padding: 16px 12px 10px 14px; }}
         .toc-row {{ font-size: 13px; color: {text}; padding: 6px 8px 6px 4px; margin: 1px 8px; border-radius: 6px; }}
         .toc-row:hover {{ background: {hover}; }}
         .toc-row.active {{ background: {active}; color: {accent}; }}
         .toc-arrow {{ font-size: 9px; color: {muted}; }}
         .toc-rail {{ padding-top: 8px; }}
         .toc-hide {{ min-width: 30px; min-height: 30px; padding: 0; margin: 6px 8px 0 0; color: {muted}; font-size: 16px; border-radius: 6px; }}
         .toc-hide:hover {{ background: {hover}; color: {accent}; }}
         .toc-rail .toc-hide {{ margin: 6px 0 0 0; }}
         .toc-hide.toc-foot {{ margin: 6px 0 8px 0; border: 1px solid {border}; }}
         .toc-hide.toc-foot-wide {{ padding: 0 12px 0 8px; font-size: 13px; }}
         .toc-rail .toc-hide.toc-foot {{ margin: 0 0 8px 0; }}
         .toc-handle:hover {{ background: {hover}; }}
         .md-table {{ background: {table_bg}; border: 1px solid {table_border}; border-radius: 8px; overflow: hidden; }}
         .md-cell {{ font-size: 13.5px; color: {text}; padding: 9px 16px; border-right: 1px solid {table_border}; border-bottom: 1px solid {table_border}; }}
         .md-cell.md-last-column {{ border-right: none; }}
         .md-cell.md-last-row {{ border-bottom: none; }}
         .md-status {{ font-size: 12px; color: {text}; background: {sidebar}; border: 1px solid {border}; border-left: none; border-bottom: none; border-top-right-radius: 6px; padding: 3px 10px; }}
         .md-head {{ font-weight: 700; color: {heading}; background: {head_bg}; }}
         .md-odd {{ background: {zebra}; }}
         picture.md-image {{ border: 1px solid {code_border}; border-radius: 6px; overflow: hidden; }}
         .md-code-head {{ min-height: 36px; padding: 0 8px 0 14px; }}
         .md-code-lang {{ padding-bottom: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; color: {muted}; }}
         .md-code-button {{ min-width: 26px; min-height: 26px; padding: 0; margin: 0 0 4px 2px; color: {muted}; border-radius: 6px; }}
         .md-code-button:hover {{ background: {hover}; color: {accent}; }}
         .md-scrim {{ background: {scrim}; }}
         .md-modal {{ background: {code_bg}; border: 1px solid {code_border}; border-radius: 8px; overflow: hidden; }}
         .md-modal .md-code-head {{ background: {code_head}; border-bottom: 1px solid {code_border}; }}
         .md-about {{ padding: 24px 32px; }}
         .md-modal-text, .md-modal-text text {{ font-family: monospace; font-size: 13px; color: {text}; background: transparent; }}"
    )
}

fn main() -> glib::ExitCode {
    // a text viewer does not need the GPU renderer, initialising its GL context costs ~125 ms at start-up
    if env::var_os("GSK_RENDERER").is_none() {
        env::set_var("GSK_RENDERER", "cairo");
    }
    let args: Vec<String> = env::args().skip(1).collect();
    let Some(file) = args.iter().find(|a| !a.starts_with("--")) else {
        eprintln!("usage: md-dit-gtk [--exit-after-head|--exit-after-full] file.md");
        process::exit(2);
    };
    // bench flags: quit once the first screen is painted, or once the whole document is in, coloured and painted
    let exit_head = args.iter().any(|a| a == "--exit-after-head");
    let exit_full = args.iter().any(|a| a == "--exit-after-full");
    let file = fs::canonicalize(file).unwrap_or_else(|e| fail(format!("{file}: {e}")));
    let app = adw::Application::builder()
        .application_id("com.shuunen.md-dit-gtk")
        .flags(gio::ApplicationFlags::NON_UNIQUE)
        .build();
    app.connect_activate(move |app| build(app, &file, exit_head, exit_full));
    app.run_with_args::<&str>(&[])
}

/// the folder and the file name for the title bar, the full path with home shown as a tilde
fn title_parts(file: &Path) -> (String, String) {
    let full = fs::canonicalize(file).unwrap_or_else(|_| file.to_path_buf());
    let name = full
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let mut folder = full
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();
    if let Some(home) = std::env::var_os("HOME").map(|h| h.to_string_lossy().into_owned()) {
        let home = home.trim_end_matches('/');
        if folder == home {
            folder = "~".into();
        } else if let Some(rest) = folder.strip_prefix(&format!("{home}/")) {
            folder = format!("~/{rest}");
        }
    }
    if !folder.ends_with('/') {
        folder.push('/');
    }
    (folder, name)
}

fn build(application: &adw::Application, file: &Path, exit_head: bool, exit_full: bool) {
    let source =
        fs::read_to_string(file).unwrap_or_else(|e| fail(format!("{}: {e}", file.display())));
    let dir = file.parent().map(Path::to_path_buf).unwrap_or_default();
    let title = file
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let (folder, name) = title_parts(file);
    let buffer = gtk::TextBuffer::new(None);
    buffer.set_enable_undo(false);
    let dark = adw::StyleManager::default().is_dark();
    let decorations: Decorations = Rc::default();
    let renderer = Renderer::new(
        &buffer,
        source.into_boxed_str(),
        &dir,
        dark,
        MIN_MARGIN as i32,
        decorations.clone(),
    );

    let view = MdView::new(decorations);
    view.set_buffer(Some(&buffer));
    view.set_editable(false);
    view.set_cursor_visible(false);
    view.set_wrap_mode(gtk::WrapMode::WordChar);
    view.set_top_margin(28);
    view.set_left_margin(MIN_MARGIN as i32);
    view.set_right_margin(MIN_MARGIN as i32);
    view.set_bottom_margin(96);
    view.set_pixels_inside_wrap(4);
    view.set_dark(dark);
    let provider = gtk::CssProvider::new();
    provider.load_from_string(&css(dark));
    gtk::style_context_add_provider_for_display(
        &gdk::Display::default().expect("a display"),
        &provider,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
    );
    // External : no scrollbar, but unlike Never the text view's minimum width (margins + a table) does not become the window's.
    // Otherwise a window widened to 1500 px kept margins and tables sized for 1500 px and could never be made narrower
    let scrolled = gtk::ScrolledWindow::builder()
        .child(&view)
        .hscrollbar_policy(gtk::PolicyType::External)
        .hexpand(true)
        .build();
    let toc = Toc::new();
    // the sidebar is either expanded or a thin rail, and can be dragged wider or narrower when expanded
    let handle = gtk::Box::builder()
        .width_request(HANDLE_WIDTH)
        .css_classes(["toc-handle"])
        .visible(false)
        .build();
    handle.set_cursor_from_name(Some("col-resize"));
    let layout = gtk::Box::new(gtk::Orientation::Horizontal, 0);
    layout.append(&toc.widget);
    layout.append(&handle);
    layout.append(&scrolled);
    let overlay = gtk::Overlay::new();
    overlay.set_child(Some(&layout));
    // an overlay never changes the layout below it, and it cannot take the pointer away from the link it describes
    let status = gtk::Label::builder()
        .halign(gtk::Align::Start)
        .valign(gtk::Align::End)
        .xalign(0.0)
        .ellipsize(gtk::pango::EllipsizeMode::Middle)
        .max_width_chars(80)
        .css_classes(["md-status"])
        .visible(false)
        .can_target(false)
        .build();
    overlay.add_overlay(&status);
    gtk::Window::set_default_icon_name("md-dit-gtk");
    let window = gtk::ApplicationWindow::builder()
        .application(application)
        .title(title)
        .default_width(900)
        .default_height(1000)
        .child(&overlay)
        .build();
    // the file name is centred in the bar, the dimmed folder ends right where it starts
    let folder_label = gtk::Label::builder()
        .label(folder)
        .halign(gtk::Align::End)
        .hexpand(true)
        .ellipsize(gtk::pango::EllipsizeMode::Start)
        .single_line_mode(true)
        .css_classes(["dim-label"])
        .build();
    let name_label = gtk::Label::builder()
        .label(name)
        .single_line_mode(true)
        .build();
    let heading = gtk::CenterBox::new();
    heading.set_hexpand(true);
    // a start margin of 40 moves the centre of the title 20 px to the right
    heading.set_margin_start(40);
    heading.set_start_widget(Some(&folder_label));
    heading.set_center_widget(Some(&name_label));
    let header = gtk::HeaderBar::new();
    header.set_title_widget(Some(&heading));
    window.set_titlebar(Some(&header));

    let app = Rc::new(App {
        file: file.to_path_buf(),
        buffer,
        view,
        scrolled: scrolled.clone(),
        window,
        overlay,
        status,
        modal: RefCell::new(None),
        code_heads: RefCell::new(Vec::new()),
        toc,
        renderer: RefCell::new(renderer),
        toc_built: Cell::new(0),
        handle,
        layout,
        user_choice: Cell::new(None),
        expanded_width: Cell::new(DEFAULT_WIDTH),
        loaded: Cell::new(false),
        generation: Cell::new(0),
        restore_scroll: Cell::new(None),
        smooth: SmoothScroll::new(&scrolled),
        pinned: Cell::new(None),
        images: RefCell::new(VecDeque::new()),
        tables: RefCell::new(Vec::new()),
        column_width: Cell::new(DEFAULT_COLUMN),
        width_mode: Cell::new(0),
        pictures: RefCell::new(Vec::new()),
        placing_images: Cell::new(false),
        modified: Cell::new(modified(file)),
        exit_head,
        exit_full,
    });
    // first screen goes in before the window is shown, the rest streams in on idle
    app.renderer.borrow_mut().render_next();
    collect_tables(&app);
    collect_codes(&app);
    start_loading(&app);
    wire(&app, &provider);
    app.window.present();
}

fn show_link(app: &App, url: Option<&str>) {
    app.view
        .set_cursor_from_name(Some(if url.is_some() { "pointer" } else { "text" }));
    if let Some(url) = url {
        app.status.set_text(url);
    }
    app.status.set_visible(url.is_some());
}

/// feeds the remaining chunks to the buffer, one per idle callback
fn start_loading(app: &Rc<App>) {
    let generation = app.generation.get() + 1;
    app.generation.set(generation);
    app.loaded.set(false);
    sync_toc(app);
    let app = app.clone();
    glib::idle_add_local(move || {
        if app.generation.get() != generation {
            return glib::ControlFlow::Break;
        }
        let more = app.renderer.borrow_mut().render_next();
        collect_tables(&app);
        collect_codes(&app);
        collect_images(&app);
        sync_toc(&app);
        if more {
            return glib::ControlFlow::Continue;
        }
        app.loaded.set(true);
        if let Some(scroll) = app.restore_scroll.take() {
            app.scrolled.vadjustment().set_value(scroll);
        }
        glib::ControlFlow::Break
    });
}

fn window_width(app: &Rc<App>) -> i32 {
    let width = app.window.width();
    if width > 0 {
        width
    } else {
        app.window.default_width()
    }
}

/// the user opened or collapsed the sidebar, that choice wins over the automatic one from now on
fn set_sidebar_open(app: &Rc<App>, open: bool) {
    app.user_choice.set(Some(open));
    sync_toc(app);
}

/// builds the missing table of contents rows and decides if the sidebar is expanded or a rail :
/// the user's choice if there is one, otherwise expanded only when the window has room around the reading column
fn sync_toc(app: &Rc<App>) {
    let renderer = app.renderer.borrow();
    let headings = renderer.headings();
    // a document with a few headings has nothing to navigate, no sidebar and no rail then
    let available = headings.len() >= MIN_TOC_HEADINGS;
    app.toc.widget.set_visible(available);
    if !available {
        app.handle.set_visible(false);
        return;
    }
    for heading in &headings[app.toc_built.get()..] {
        app.toc.add(heading.level, &heading.text);
    }
    app.toc_built.set(headings.len());
    drop(renderer);
    let room =
        window_width(app) >= COLUMN_WIDTH as i32 + 2 * MIN_MARGIN as i32 + app.expanded_width.get();
    let open = app.user_choice.get().unwrap_or(room);
    let changed = app.toc.is_open() != open;
    app.toc.set_open(open);
    let (narrowest, widest) = app.toc.bounds();
    // clamped for display only : what the user dragged to is kept, more headings may make room for it later
    let width = if open {
        app.expanded_width.get().clamp(narrowest, widest)
    } else {
        RAIL_WIDTH
    };
    if changed {
        app.toc.animate_width(width);
    } else if !app.toc.animating() {
        app.toc.set_width(width);
    }
    app.handle.set_visible(open);
    update_active(app);
}

/// highlights the heading the reader is currently under
fn update_active(app: &Rc<App>) {
    if !app.toc.is_open() {
        return;
    }
    let value = app.scrolled.vadjustment().value();
    // the picked heading stays the active one even when the next heading is within reach of the offset below,
    // or when the end of the page keeps it from reaching the top
    if let Some((index, settled)) = app.pinned.get() {
        if settled.is_none_or(|settled| (value - settled).abs() <= 1.0) {
            app.toc.set_active(Some(index));
            return;
        }
        app.pinned.set(None);
    }
    let y = value + ACTIVE_OFFSET;
    let (_, by) = app
        .view
        .window_to_buffer_coords(gtk::TextWindowType::Widget, 0, y as i32);
    // unlike iter_at_location this works wherever the point is, even left of the text
    let (iter, _) = app.view.line_at_y(by);
    let top = iter.offset();
    let renderer = app.renderer.borrow();
    let passed = renderer
        .headings()
        .partition_point(|heading| app.buffer.iter_at_mark(&heading.mark).offset() <= top);
    app.toc.set_active(passed.checked_sub(1));
}

/// puts a grid of labels, scrollable sideways, on each table anchor
fn collect_tables(app: &Rc<App>) {
    for PendingTable {
        anchor,
        rows,
        header_rows,
        aligns,
    } in app.renderer.borrow_mut().take_tables()
    {
        let grid = gtk::Grid::builder().halign(gtk::Align::Start).build();
        let last_row = rows.len().saturating_sub(1);
        let mut cells: Vec<Vec<gtk::Label>> = Vec::new();
        for (r, row) in rows.iter().enumerate() {
            let last_column = row.len().saturating_sub(1);
            let mut line = Vec::new();
            for (c, markup) in row.iter().enumerate() {
                let xalign = match aligns.get(c) {
                    Some(Alignment::Center) => 0.5,
                    Some(Alignment::Right) => 1.0,
                    _ => 0.0,
                };
                let cell = gtk::Label::builder()
                    .use_markup(true)
                    .label(markup)
                    .xalign(xalign)
                    .wrap(true)
                    .wrap_mode(gtk::pango::WrapMode::WordChar)
                    .max_width_chars(36)
                    .selectable(true)
                    .css_classes(["md-cell"])
                    .build();
                // the label opens links itself, so the allowlist has to stop it too
                cell.connect_activate_link(|_, uri| {
                    if is_safe_uri(uri) {
                        glib::Propagation::Proceed
                    } else {
                        glib::Propagation::Stop
                    }
                });
                if r < header_rows {
                    cell.add_css_class("md-head");
                } else if (r - header_rows) % 2 == 1 {
                    cell.add_css_class("md-odd");
                }
                if c == last_column {
                    cell.add_css_class("md-last-column");
                }
                if r == last_row {
                    cell.add_css_class("md-last-row");
                }
                grid.attach(&cell, c as i32, r as i32, 1, 1);
                line.push(cell);
            }
            cells.push(line);
        }
        // every cell of a column gets that column's natural width as a minimum : a wrapping label squeezed below its
        // natural width grows tall, which made the scroll area ask for a huge height instead of scrolling sideways
        let columns = cells.iter().map(Vec::len).max().unwrap_or(0);
        for c in 0..columns {
            let width = cells
                .iter()
                .filter_map(|row| row.get(c))
                .map(|cell| cell.measure(gtk::Orientation::Horizontal, -1).1)
                .max()
                .unwrap_or(0);
            for cell in cells.iter().filter_map(|row| row.get(c)) {
                cell.set_size_request(width, -1);
            }
        }
        // plus the 1 px border on each side of .md-table, which the width request includes : without it the grid
        // is 2 px wider than the room inside and a scrollbar shows even though the table fits
        let natural = grid.measure(gtk::Orientation::Horizontal, -1).1 + 2;
        let scrolled = gtk::ScrolledWindow::builder()
            .child(&grid)
            .hscrollbar_policy(gtk::PolicyType::Automatic)
            .vscrollbar_policy(gtk::PolicyType::Never)
            .propagate_natural_height(true)
            .halign(gtk::Align::Start)
            .width_request(natural.min(app.column_width.get()))
            .css_classes(["md-table"])
            .build();
        // the table's scroll area would keep every wheel event, so over a table the page could not scroll :
        // vertical movement goes to the page, horizontal movement (or shift + wheel) still scrolls the table
        let page = app.scrolled.vadjustment();
        let forward = gtk::EventControllerScroll::new(gtk::EventControllerScrollFlags::BOTH_AXES);
        forward.set_propagation_phase(gtk::PropagationPhase::Capture);
        forward.connect_scroll(move |controller, dx, dy| {
            if dy.abs() <= dx.abs()
                || controller
                    .current_event_state()
                    .contains(gdk::ModifierType::SHIFT_MASK)
            {
                return glib::Propagation::Proceed;
            }
            // same step as a scrolled window takes for a wheel click, applied once the event is fully handled
            let page = page.clone();
            glib::idle_add_local_once(move || {
                page.set_value(page.value() + dy * page.page_size().powf(2.0 / 3.0))
            });
            glib::Propagation::Stop
        });
        scrolled.add_controller(forward);
        app.view.add_child_at_anchor(&scrolled, &anchor);
        app.tables.borrow_mut().push((scrolled, natural));
    }
}

fn set_icon(button: &gtk::Button, icon: &str) {
    if let Some(image) = button.child().and_downcast::<gtk::Image>() {
        image.set_icon_name(Some(icon));
    }
}

fn icon_button(icon: &str, tooltip: &str) -> gtk::Button {
    // the icon is its own centred child, so it sits in the middle of the square whatever the theme pads the button with
    let image = gtk::Image::builder()
        .icon_name(icon)
        .halign(gtk::Align::Center)
        .valign(gtk::Align::Center)
        .build();
    let button = gtk::Button::builder()
        .child(&image)
        .tooltip_text(tooltip)
        .halign(gtk::Align::Center)
        .valign(gtk::Align::Center)
        .css_classes(["flat", "md-code-button"])
        .build();
    button.set_cursor_from_name(Some("pointer"));
    button
}

/// the language, then the buttons : copy, and expand or collapse
fn code_header(language: &str, buttons: &[&gtk::Button]) -> gtk::Box {
    let header = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .valign(gtk::Align::Center)
        .css_classes(["md-code-head"])
        .build();
    let label = gtk::Label::builder()
        .label(language.to_uppercase())
        .xalign(0.0)
        .hexpand(true)
        .css_classes(["md-code-lang"])
        .build();
    header.append(&label);
    for button in buttons {
        header.append(*button);
    }
    header
}

fn copy_button(app: &Rc<App>, code: &PendingCode) -> gtk::Button {
    let button = icon_button("edit-copy-symbolic", "Copy");
    let (app, code_start, code_end) = (app.clone(), code.start.clone(), code.end.clone());
    button.connect_clicked(move |button| {
        let text = app.buffer.text(
            &app.buffer.iter_at_mark(&code_start),
            &app.buffer.iter_at_mark(&code_end),
            false,
        );
        button.clipboard().set_text(text.trim_end_matches('\n'));
        // a check mark tells the copy happened, then the icon comes back
        set_icon(button, "object-select-symbolic");
        let button = button.clone();
        glib::timeout_add_local_once(Duration::from_millis(1200), move || {
            set_icon(&button, "edit-copy-symbolic")
        });
    });
    button
}

/// puts a header, with its buttons, on each code block anchor
fn collect_codes(app: &Rc<App>) {
    for code in app.renderer.borrow_mut().take_codes() {
        let copy = copy_button(app, &code);
        let expand = icon_button("view-fullscreen-symbolic", "Full screen");
        let fold = icon_button("pan-down-symbolic", "Collapse");
        let header = code_header(&code.language, &[&copy, &expand, &fold]);
        header.set_halign(gtk::Align::Start);
        header.set_width_request(app.column_width.get() - 1);
        let (opened, expanded) = (app.clone(), code.clone());
        expand.connect_clicked(move |_| open_modal(&opened, &expanded));
        let (folded, block, busy) = (app.clone(), code.clone(), Rc::new(Cell::new(false)));
        fold.connect_clicked(move |button| {
            if busy.replace(true) {
                return;
            }
            let folding = !block.collapsed.get();
            set_icon(
                button,
                if folding {
                    "pan-end-symbolic"
                } else {
                    "pan-down-symbolic"
                },
            );
            button.set_tooltip_text(Some(if folding { "Expand" } else { "Collapse" }));
            animate_fold(&folded, &block, folding, busy.clone());
        });
        app.view.add_child_at_anchor(&header, &code.anchor);
        app.code_heads.borrow_mut().push(header);
    }
}

/// shows or hides the code a few lines at a time, so the block slides shut or open
fn animate_fold(app: &Rc<App>, block: &PendingCode, folding: bool, busy: Rc<Cell<bool>>) {
    let buffer = &app.buffer;
    let first = buffer.iter_at_mark(&block.start).line();
    let lines = buffer.iter_at_mark(&block.end).line() - first;
    // the border under the header shows from the first frame when opening
    if !folding {
        block.collapsed.set(false);
    }
    let (app, block) = (app.clone(), block.clone());
    let begin = Cell::new(None);
    app.view.clone().add_tick_callback(move |_, clock| {
        let now = clock.frame_time();
        let start = begin.get().unwrap_or(now);
        begin.set(Some(start));
        let progress = ((now - start) as f64 / (FOLD_MS * 1000.0)).min(1.0);
        let moved = (view::ease_out(progress) * f64::from(lines)).round() as i32;
        let shown = if folding { lines - moved } else { moved };
        let (from, to) = (
            app.buffer.iter_at_mark(&block.start),
            app.buffer.iter_at_mark(&block.end),
        );
        app.buffer.remove_tag(&block.hidden, &from, &to);
        if let Some(old) = block.cut.borrow_mut().take() {
            app.buffer.delete_mark(&old);
        }
        if progress >= 1.0 {
            block.collapsed.set(folding);
            if folding {
                app.buffer.apply_tag(&block.hidden, &from, &to);
            }
            busy.set(false);
            app.view.repaint();
            return glib::ControlFlow::Break;
        }
        let cut = app.buffer.iter_at_line(first + shown).unwrap_or(to);
        app.buffer.apply_tag(&block.hidden, &cut, &to);
        *block.cut.borrow_mut() = Some(app.buffer.create_mark(None, &cut, true));
        app.view.repaint();
        glib::ControlFlow::Continue
    });
}

fn close_modal(app: &Rc<App>) {
    if let Some(modal) = app.modal.borrow_mut().take() {
        app.overlay.remove_overlay(&modal);
    }
}

/// the code block again, highlighted, over almost the whole window
fn open_modal(app: &Rc<App>, code: &PendingCode) {
    close_modal(app);
    // same tag table, so the copy keeps its colours and follows the theme
    let buffer = gtk::TextBuffer::new(Some(&app.buffer.tag_table()));
    let (from, to) = (
        app.buffer.iter_at_mark(&code.start),
        app.buffer.iter_at_mark(&code.end),
    );
    buffer.insert_range(&mut buffer.end_iter(), &from, &to);
    let (first, last) = buffer.bounds();
    for tag in &code.plain {
        buffer.remove_tag(tag, &first, &last);
    }
    let text = gtk::TextView::builder()
        .buffer(&buffer)
        .editable(false)
        .cursor_visible(false)
        .wrap_mode(gtk::WrapMode::None)
        .left_margin(16)
        .right_margin(16)
        .top_margin(12)
        .bottom_margin(12)
        .css_classes(["md-modal-text"])
        .build();
    let body = gtk::ScrolledWindow::builder()
        .child(&text)
        .vexpand(true)
        .build();
    let copy = copy_button(app, code);
    let restore = icon_button("view-restore-symbolic", "Leave full screen");
    let card = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .margin_top(32)
        .margin_bottom(32)
        .margin_start(32)
        .margin_end(32)
        .css_classes(["md-modal"])
        .build();
    card.append(&code_header(&code.language, &[&copy, &restore]));
    card.append(&body);
    let scrim = gtk::Box::builder().css_classes(["md-scrim"]).build();
    scrim.append(&card);
    card.set_hexpand(true);
    let closing = app.clone();
    restore.connect_clicked(move |_| close_modal(&closing));
    // a click beside the card, on the dimmed window, closes it too
    let click = gtk::GestureClick::new();
    let outside = app.clone();
    let dimmed = scrim.clone();
    click.connect_released(move |_, _, x, y| {
        if dimmed
            .pick(x, y, gtk::PickFlags::DEFAULT)
            .is_some_and(|hit| hit == dimmed)
        {
            close_modal(&outside);
        }
    });
    scrim.add_controller(click);
    app.overlay.add_overlay(&scrim);
    *app.modal.borrow_mut() = Some(scrim.upcast());
}

/// a small card over the dimmed window with the details of the app
fn open_about(app: &Rc<App>) {
    close_modal(app);
    let name = gtk::Label::builder()
        .label("md-dit")
        .css_classes(["title-1"])
        .build();
    let details = gtk::Grid::builder()
        .row_spacing(8)
        .column_spacing(24)
        .halign(gtk::Align::Center)
        .build();
    let label = |text: &str, muted: bool| {
        let label = gtk::Label::builder().label(text).xalign(0.0).build();
        if muted {
            label.add_css_class("dim-label");
        }
        label
    };
    let rows = [
        ("Version", env!("CARGO_PKG_VERSION")),
        ("Built at", env!("BUILD_TIME")),
        ("Developer", "Shuunen"),
    ];
    for (row, (key, value)) in rows.iter().enumerate() {
        details.attach(&label(key, true), 0, row as i32, 1, 1);
        details.attach(&label(value, false), 1, row as i32, 1, 1);
    }
    let repo = "https://github.com/Shuunen/snippets/tree/master/src/md-dit";
    // a markup link is a plain label, it lines up with the other values unlike a padded link button
    let link = label("", false);
    link.set_markup(&format!("<a href=\"{repo}\">{repo}</a>"));
    link.set_cursor_from_name(Some("pointer"));
    details.attach(&label("GitHub", true), 0, 3, 1, 1);
    details.attach(&link, 1, 3, 1, 1);
    let close = gtk::Button::builder()
        .label("Close")
        .margin_top(8)
        .halign(gtk::Align::Center)
        .build();
    let card = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(12)
        .halign(gtk::Align::Center)
        .valign(gtk::Align::Center)
        .margin_top(32)
        .margin_bottom(32)
        .margin_start(32)
        .margin_end(32)
        .css_classes(["md-modal", "md-about"])
        .build();
    let icon = gtk::Image::builder()
        .icon_name("md-dit-gtk")
        .pixel_size(64)
        .build();
    card.append(&icon);
    card.append(&name);
    card.append(
        &gtk::Label::builder()
            .label("Instant markdown viewer for Linux, built on native GTK4 with no webview.")
            .justify(gtk::Justification::Center)
            .wrap(true)
            .max_width_chars(40)
            .css_classes(["dim-label"])
            .build(),
    );
    card.append(&details);
    card.append(&close);
    let scrim = gtk::Box::builder().css_classes(["md-scrim"]).build();
    scrim.append(&card);
    card.set_hexpand(true);
    let closing = app.clone();
    close.connect_clicked(move |_| close_modal(&closing));
    let click = gtk::GestureClick::new();
    let outside = app.clone();
    let dimmed = scrim.clone();
    click.connect_released(move |_, _, x, y| {
        if dimmed
            .pick(x, y, gtk::PickFlags::DEFAULT)
            .is_some_and(|hit| hit == dimmed)
        {
            close_modal(&outside);
        }
    });
    scrim.add_controller(click);
    app.overlay.add_overlay(&scrim);
    *app.modal.borrow_mut() = Some(scrim.upcast());
}

fn collect_images(app: &Rc<App>) {
    let found = app.renderer.borrow_mut().take_images();
    if found.is_empty() {
        return;
    }
    app.images.borrow_mut().extend(found);
    if app.placing_images.replace(true) {
        return;
    }
    let app = app.clone();
    // decoding images never competes with painting or with the rest of the document
    glib::idle_add_local_full(glib::Priority::LOW, move || {
        let next = app.images.borrow_mut().pop_front();
        match next {
            Some(image) => {
                place_image(&app, image);
                glib::ControlFlow::Continue
            }
            None => {
                app.placing_images.set(false);
                glib::ControlFlow::Break
            }
        }
    });
}

fn size_picture(picture: &gtk::Picture, ratio: f64, natural: Option<i32>, column: i32) {
    let width = natural.map_or(column, |natural| natural.min(column));
    picture.set_size_request(width, (f64::from(width) * ratio) as i32);
}

fn place_image(app: &Rc<App>, image: PendingImage) {
    match &image.source {
        ImageSource::Local(path) => {
            if let Some((texture, natural)) = fs::read(path).ok().and_then(|bytes| decode(&bytes)) {
                insert_picture(app, &image, &texture, natural);
            }
        }
        ImageSource::Remote(url) => {
            let (app, url, generation) = (app.clone(), url.clone(), app.generation.get());
            glib::spawn_future_local(async move {
                let Ok(Some(bytes)) = gio::spawn_blocking(move || fetch(&url)).await else {
                    return;
                };
                // the document was reloaded meanwhile, the marks no longer point at this image
                if app.generation.get() != generation
                    || image.start.is_deleted()
                    || image.end.is_deleted()
                {
                    return;
                }
                if let Some((texture, natural)) = decode(&bytes) {
                    insert_picture(&app, &image, &texture, natural);
                }
            });
        }
    }
}

/// the texture and the widest it may be displayed, none when it fills the reading column (a svg without a declared size)
fn decode(bytes: &[u8]) -> Option<(gdk::Texture, Option<i32>)> {
    let head = &bytes[..bytes.len().min(1024)];
    let Some(root) = head.windows(4).position(|window| window == b"<svg") else {
        let texture = gdk::Texture::from_bytes(&glib::Bytes::from(bytes)).ok()?;
        let width = texture.width();
        return Some((texture, Some(width)));
    };
    // librsvg skips html text in a foreignObject, rewrite it into native svg text
    let rewritten = std::str::from_utf8(bytes)
        .ok()
        .and_then(svg::inline_foreign_objects);
    let bytes = glib::Bytes::from(rewritten.as_deref().map_or(bytes, str::as_bytes));
    let load = |width: i32| {
        let stream = gio::MemoryInputStream::from_bytes(&bytes);
        Pixbuf::from_stream_at_scale(&stream, width, -1, true, gio::Cancellable::NONE).ok()
    };
    let root_tag = &head[root..head
        .iter()
        .skip(root)
        .position(|byte| *byte == b'>')
        .map_or(head.len(), |end| root + end)];
    let declares_width = root_tag
        .windows(7)
        .any(|window| window.eq_ignore_ascii_case(b" width="));
    // a svg is vector : it is rasterized twice as large as displayed so it stays sharp on a hidpi screen
    let (pixbuf, natural) = if declares_width {
        let width = Pixbuf::from_stream(
            &gio::MemoryInputStream::from_bytes(&bytes),
            gio::Cancellable::NONE,
        )
        .ok()?
        .width();
        (load(2 * width)?, Some(width))
    } else {
        (load(2 * COLUMN_WIDTH as i32)?, None)
    };
    Some((gdk::Texture::for_pixbuf(&pixbuf), natural))
}

/// the body of a web image, none when the request failed, took too long or is bigger than a sane image
fn fetch(url: &str) -> Option<Vec<u8>> {
    const MAX_BYTES: u64 = 10 * 1024 * 1024;
    let agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(10)))
        .build()
        .new_agent();
    let mut response = agent.get(url).call().ok()?;
    response
        .body_mut()
        .with_config()
        .limit(MAX_BYTES)
        .read_to_vec()
        .ok()
}

fn insert_picture(
    app: &Rc<App>,
    image: &PendingImage,
    texture: &gdk::Texture,
    natural: Option<i32>,
) {
    let ratio = f64::from(texture.height()) / f64::from(texture.width());
    let mut start = app.buffer.iter_at_mark(&image.start);
    let mut end = app.buffer.iter_at_mark(&image.end);
    // a line takes its paragraph spacing from the tags of its first character, so the anchor must inherit them
    let tags = start.tags();
    // deleting the image text collapses the link marks around it, the anchor has to land inside the link
    let wrapping = app
        .renderer
        .borrow()
        .link_ends_around(start.offset(), end.offset());
    app.buffer.delete(&mut start, &mut end);
    let anchor = app.buffer.create_child_anchor(&mut start);
    for mark in &wrapping {
        app.buffer.move_mark(mark, &start);
    }
    let mut before = start;
    before.backward_char();
    // except the link underline, a badge is not text
    for tag in tags.iter().filter(|tag| {
        tag.property::<gtk::pango::Underline>("underline") == gtk::pango::Underline::None
    }) {
        app.buffer.apply_tag(tag, &before, &start);
    }
    // a picture of its own, not a badge, gets room around it
    if natural.is_none_or(|width| width >= 200) {
        let table = app.buffer.tag_table();
        let room = table.lookup("md-picture").unwrap_or_else(|| {
            let created = gtk::TextTag::builder()
                .name("md-picture")
                .pixels_above_lines(12)
                .pixels_below_lines(35)
                .build();
            table.add(&created);
            created
        });
        app.buffer.apply_tag(&room, &before, &start);
    }
    let picture = gtk::Picture::for_paintable(texture);
    // badges stay bare, only a picture of its own gets the border
    if natural.is_none_or(|width| width >= 200) {
        picture.add_css_class("md-image");
    }
    picture.set_can_shrink(true);
    size_picture(&picture, ratio, natural, app.column_width.get());
    app.pictures
        .borrow_mut()
        .push((picture.clone(), ratio, natural));
    app.view.add_child_at_anchor(&picture, &anchor);
    app.buffer.delete_mark(&image.start);
    app.buffer.delete_mark(&image.end);
}

/// a document is untrusted, so only web and mail links are opened, never file:, ssh: or a custom handler
fn is_safe_uri(uri: &str) -> bool {
    let scheme = uri.split_once(':').map_or("", |(scheme, _)| scheme);
    ["http", "https", "mailto"]
        .iter()
        .any(|allowed| scheme.eq_ignore_ascii_case(allowed))
}

/// the anchor GitHub gives a heading : lowercase, spaces to dashes, punctuation dropped
fn slugify(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .filter_map(|c| match c {
            ' ' => Some('-'),
            '-' | '_' => Some(c),
            c if c.is_alphanumeric() => Some(c),
            _ => None,
        })
        .collect()
}

/// index of the heading an in-page `#slug` link points to, repeated headings get `-1`, `-2`... like on GitHub
fn find_heading(texts: &[&str], slug: &str) -> Option<usize> {
    let slug = slug.to_lowercase();
    let mut seen: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    texts.iter().position(|text| {
        let base = slugify(text);
        let count = seen.entry(base.clone()).or_insert(0);
        let unique = if *count == 0 {
            base
        } else {
            format!("{base}-{count}")
        };
        *count += 1;
        unique == slug
    })
}

/// false when the file could not be read, so the caller can retry on the next poll
fn reload(app: &Rc<App>) -> bool {
    let Ok(source) = fs::read_to_string(&app.file) else {
        return false;
    };
    app.restore_scroll
        .set(Some(app.scrolled.vadjustment().value()));
    app.images.borrow_mut().clear();
    app.tables.borrow_mut().clear();
    app.code_heads.borrow_mut().clear();
    close_modal(app);
    app.pictures.borrow_mut().clear();
    app.toc.clear();
    app.toc_built.set(0);
    {
        let mut renderer = app.renderer.borrow_mut();
        renderer.load(source.into_boxed_str());
        renderer.render_next();
        renderer.start_highlight();
    }
    collect_tables(app);
    collect_codes(app);
    start_loading(app);
    true
}

/// sizes the reading column from the picked width and the room there is, margins can't change during the allocation that
/// reports the new width (GTK asserts), so they are applied on idle
fn apply_column(app: &Rc<App>) {
    let page = app.scrolled.hadjustment().page_size();
    let margin = ((page - WIDTH_MODES[app.width_mode.get()].0) / 2.0).max(MIN_MARGIN) as i32;
    let column = (page as i32 - 2 * margin).max(200);
    let sized = app.clone();
    glib::idle_add_local_once(move || {
        sized.column_width.set(column);
        for (table, natural) in sized.tables.borrow().iter() {
            table.set_width_request((*natural).min(column));
        }
        // 1 px short : exactly the column made the page 1 px wider than the window, hence a sideways scroll
        for head in sized.code_heads.borrow().iter() {
            head.set_width_request(column - 1);
        }
        for (picture, ratio, natural) in sized.pictures.borrow().iter() {
            size_picture(picture, *ratio, *natural, column);
        }
        if margin != sized.view.left_margin() {
            sized.view.set_left_margin(margin);
            sized.view.set_right_margin(margin);
            sized.renderer.borrow().set_margin(margin);
        }
        sync_toc(&sized);
    });
}

fn wire(app: &Rc<App>, provider: &gtk::CssProvider) {
    let selected = app.clone();
    let hidden = app.clone();
    let folded = app.clone();
    app.toc.set_callbacks(
        move |index| {
            let mark = selected
                .renderer
                .borrow()
                .headings()
                .get(index)
                .map(|heading| heading.mark.clone());
            if let Some(mark) = mark {
                jump_to_heading(&selected, &mark, index);
                selected.toc.set_active(Some(index));
            }
        },
        move |open| set_sidebar_open(&hidden, open),
        move || sync_toc(&folded),
    );

    app.toc
        .set_width_icon(WIDTH_MODES[0].1, WIDTH_MODES[0].2, WIDTH_MODES[0].3);
    let cycled = app.clone();
    app.toc.set_width_callback(move || {
        let mode = (cycled.width_mode.get() + 1) % WIDTH_MODES.len();
        cycled.width_mode.set(mode);
        cycled.toc.set_width_icon(
            WIDTH_MODES[mode].1,
            WIDTH_MODES[mode].2,
            WIDTH_MODES[mode].3,
        );
        apply_column(&cycled);
    });
    let (icon, label, tooltip) = theme_button_content(adw::StyleManager::default().is_dark());
    app.toc.set_theme_icon(icon, label, tooltip);
    app.toc.set_theme_callback(|| {
        let manager = adw::StyleManager::default();
        manager.set_color_scheme(if manager.is_dark() {
            adw::ColorScheme::ForceLight
        } else {
            adw::ColorScheme::ForceDark
        });
    });
    let about = app.clone();
    app.toc.set_about_callback(move || open_about(&about));
    let sized = app.clone();
    app.scrolled
        .hadjustment()
        .connect_page_size_notify(move |_| apply_column(&sized));
    // the page never needs to scroll sideways (tables scroll inside the column), so a pixel or two of overflow from a
    // widget rounding up is not allowed to show up as a sideways scroll
    app.scrolled
        .hadjustment()
        .connect_value_changed(|adjustment| {
            if adjustment.value() != 0.0 {
                adjustment.set_value(0.0);
            }
        });

    // dragging the handle resizes the sidebar, never wider than its longest displayed label and never narrower than its minimum.
    // The gesture lives on the container, not on the handle: the handle moves while it is dragged, which would shift the offsets
    let drag = gtk::GestureDrag::new();
    drag.set_propagation_phase(gtk::PropagationPhase::Capture);
    let start_width = Rc::new(Cell::new(0));
    let (begun, begun_width) = (app.clone(), start_width.clone());
    drag.connect_drag_begin(move |gesture, x, y| {
        let on_handle = begun.handle.is_visible()
            && begun
                .handle
                .compute_bounds(&begun.layout)
                .is_some_and(|bounds| {
                    bounds.contains_point(&gtk::graphene::Point::new(x as f32, y as f32))
                });
        if on_handle {
            begun_width.set(begun.toc.widget.width());
            gesture.set_state(gtk::EventSequenceState::Claimed);
        } else {
            gesture.set_state(gtk::EventSequenceState::Denied);
        }
    });
    let dragged = app.clone();
    drag.connect_drag_update(move |_, dx, _| {
        let (narrowest, widest) = dragged.toc.bounds();
        let width = (start_width.get() + dx as i32).clamp(narrowest, widest);
        dragged.expanded_width.set(width);
        dragged.toc.set_width(width);
    });
    app.layout.add_controller(drag);
    smooth_wheel(app);
    let scrolling = app.clone();
    app.scrolled
        .vadjustment()
        .connect_value_changed(move |_| update_active(&scrolling));

    let click = gtk::GestureClick::new();
    let clicked = app.clone();
    click.connect_released(move |_, _, x, y| {
        let (bx, by) =
            clicked
                .view
                .window_to_buffer_coords(gtk::TextWindowType::Widget, x as i32, y as i32);
        let Some(iter) = clicked.view.iter_at_location(bx, by) else {
            return;
        };
        let url = clicked.renderer.borrow().link_at(iter.offset());
        if let Some(slug) = url.as_deref().and_then(|url| url.strip_prefix('#')) {
            let found = {
                let renderer = clicked.renderer.borrow();
                let texts: Vec<&str> = renderer
                    .headings()
                    .iter()
                    .map(|h| h.text.as_str())
                    .collect();
                find_heading(&texts, slug)
                    .map(|index| (index, renderer.headings()[index].mark.clone()))
            };
            if let Some((index, mark)) = found {
                jump_to_heading(&clicked, &mark, index);
                clicked.toc.set_active(Some(index));
            }
        } else if let Some(url) = url.filter(|url| is_safe_uri(url)) {
            gtk::UriLauncher::new(&url).launch(
                Some(&clicked.window),
                gio::Cancellable::NONE,
                |_| {},
            );
        }
    });
    app.view.add_controller(click);

    // a link under the pointer gets a hand cursor and its address in the status bar, which is gone again once the pointer leaves
    let motion = gtk::EventControllerMotion::new();
    let moved = app.clone();
    motion.connect_motion(move |_, x, y| {
        let (bx, by) =
            moved
                .view
                .window_to_buffer_coords(gtk::TextWindowType::Widget, x as i32, y as i32);
        let offset = moved
            .view
            .iter_at_location(bx, by)
            .map(|iter| iter.offset());
        moved.renderer.borrow().hover_link(offset);
        let url = offset.and_then(|offset| moved.renderer.borrow().link_at(offset));
        show_link(&moved, url.as_deref());
    });
    let left = app.clone();
    motion.connect_leave(move |_| {
        left.renderer.borrow().hover_link(None);
        show_link(&left, None);
    });
    app.view.add_controller(motion);

    let keys = gtk::EventControllerKey::new();
    let toggled = app.clone();
    keys.connect_key_pressed(move |_, key, _, state| {
        let plain = !state.intersects(
            gdk::ModifierType::CONTROL_MASK
                | gdk::ModifierType::ALT_MASK
                | gdk::ModifierType::META_MASK,
        );
        if key == gdk::Key::Escape && toggled.modal.borrow().is_some() {
            close_modal(&toggled);
            return glib::Propagation::Stop;
        }
        if toggled.modal.borrow().is_some() {
            return glib::Propagation::Proceed;
        }
        if plain && key == gdk::Key::t {
            set_sidebar_open(&toggled, !toggled.toc.is_open());
            return glib::Propagation::Stop;
        }
        glib::Propagation::Proceed
    });
    app.window.add_controller(keys);

    let themed = app.clone();
    let provider = provider.clone();
    adw::StyleManager::default().connect_dark_notify(move |manager| {
        let dark = manager.is_dark();
        let (icon, label, tooltip) = theme_button_content(dark);
        themed.toc.set_theme_icon(icon, label, tooltip);
        provider.load_from_string(&css(dark));
        themed.view.set_dark(dark);
        themed.renderer.borrow().apply_palette(dark);
    });

    // colours arrive from the highlighter thread, and the file is checked for changes (live reload)
    let ticking = app.clone();
    let ticks = Cell::new(0u32);
    glib::timeout_add_local(POLL_INTERVAL, move || {
        ticking.renderer.borrow_mut().poll_highlight();
        ticks.set(ticks.get() + 1);
        if ticks.get().is_multiple_of(RELOAD_EVERY) {
            let now = modified(&ticking.file);
            if now.is_some() && now != ticking.modified.get() && reload(&ticking) {
                ticking.modified.set(now);
            }
        }
        glib::ControlFlow::Continue
    });

    let painted = app.clone();
    app.window.connect_map(move |window| {
        let painted = painted.clone();
        let started = Cell::new(false);
        if let Some(clock) = window.frame_clock() {
            clock.connect_after_paint(move |_| {
                if !started.replace(true) {
                    painted.renderer.borrow_mut().start_highlight();
                }
                let done = painted.loaded.get() && !painted.renderer.borrow().highlight_pending();
                if painted.exit_head || (painted.exit_full && done) {
                    if let Some(application) = painted.window.application() {
                        application.quit();
                    }
                }
            });
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn anchors_match_headings_like_github() {
        let texts = ["What it does", "Why it is fast?", "Icon", "Icon"];
        assert_eq!(find_heading(&texts, "what-it-does"), Some(0));
        assert_eq!(find_heading(&texts, "why-it-is-fast"), Some(1));
        assert_eq!(find_heading(&texts, "icon-1"), Some(3));
        assert_eq!(find_heading(&texts, "nope"), None);
    }

    #[test]
    fn only_web_and_mail_links_are_safe() {
        for uri in [
            "http://a.b",
            "https://a.b/c",
            "HTTPS://A.B",
            "mailto:me@a.b",
        ] {
            assert!(is_safe_uri(uri), "{uri}");
        }
        for uri in [
            "file:///etc/passwd",
            "ssh://host",
            "smb://host/share",
            "javascript:alert(1)",
            "#anchor",
            "./readme.md",
            "",
        ] {
            assert!(!is_safe_uri(uri), "{uri}");
        }
    }
}

/// the heading's distance from the top of the view, none while it cannot go any higher because the page ends there
fn heading_offset(app: &App, mark: &gtk::TextMark) -> Option<i32> {
    let iter = app.buffer.iter_at_mark(mark);
    let (_, y) = app.view.buffer_to_window_coords(
        gtk::TextWindowType::Widget,
        0,
        app.view.iter_location(&iter).y(),
    );
    let adjustment = app.scrolled.vadjustment();
    let at_end = adjustment.value() >= adjustment.upper() - adjustment.page_size() - 1.0;
    (!(at_end && y > HEADING_PADDING)).then_some(y)
}

/// scrolls a heading to the top. The view scrolls once it has measured the lines on the way, which an ongoing wheel
/// animation, or lines still changing height (pills, pictures), made it lose, so check that it landed and ask again if not
fn jump_to_heading(app: &Rc<App>, mark: &gtk::TextMark, index: usize) {
    app.pinned.set(Some((index, None)));
    app.smooth.animation.pause();
    app.view.scroll_to_mark(mark, 0.0, true, 0.0, 0.0);
    let app = app.clone();
    let mark = mark.clone();
    let tries = Cell::new(0);
    glib::timeout_add_local(Duration::from_millis(50), move || {
        tries.set(tries.get() + 1);
        if let Some(y) = heading_offset(&app, &mark).filter(|y| (y - HEADING_PADDING).abs() > 2) {
            let adjustment = app.scrolled.vadjustment();
            adjustment.set_value(adjustment.value() + f64::from(y - HEADING_PADDING));
        } else if tries.get() > 2 {
            settle(&app, index);
            return glib::ControlFlow::Break;
        }
        if tries.get() < 20 {
            glib::ControlFlow::Continue
        } else {
            settle(&app, index);
            glib::ControlFlow::Break
        }
    });
}

/// the jump is over, the page stays where it is until the user moves it
fn settle(app: &App, index: usize) {
    app.pinned
        .set(Some((index, Some(app.scrolled.vadjustment().value()))));
}
