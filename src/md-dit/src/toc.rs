//! the table of contents sidebar : expanded (a header, then a collapsible tree of headings with the current one
//! highlighted) or collapsed to a thin rail that keeps a button to expand it again

use std::{
    cell::{Cell, RefCell},
    rc::Rc,
};

use gtk::prelude::*;

const INDENT: i32 = 12;
/// how long the sidebar takes to open or fold, in milliseconds
const ANIMATION_MS: u32 = 200;
pub const DEFAULT_WIDTH: i32 = 260;
pub const RAIL_WIDTH: i32 = 42;
/// the sidebar border, the only thing on top of the widest label
const WIDTH_SLACK: i32 = 2;

type SelectCallback = Box<dyn Fn(usize)>;
type ToggleCallback = Box<dyn Fn(bool)>;

struct Row {
    widget: gtk::Box,
    arrow: gtk::Label,
    level: usize,
    has_children: Cell<bool>,
    /// natural width of the row, label included
    natural: i32,
}

pub struct Toc {
    /// either the full sidebar or the rail
    pub widget: gtk::Stack,
    scrolled: gtk::ScrolledWindow,
    /// the header, its natural width is the narrowest the open sidebar may be
    header: gtk::Box,
    list: gtk::Box,
    rows: RefCell<Vec<Row>>,
    collapsed: RefCell<Vec<bool>>,
    active: Cell<Option<usize>>,
    open: Cell<bool>,
    /// the running width animation, if any
    tick: RefCell<Option<gtk::TickCallbackId>>,
    on_select: RefCell<Option<SelectCallback>>,
    on_toggle: RefCell<Option<ToggleCallback>>,
    on_fold: RefCell<Option<Box<dyn Fn()>>>,
    on_width: RefCell<Option<Box<dyn Fn()>>>,
    /// the reading width buttons, one in the open sidebar and one in the rail, always showing the same icon
    width_buttons: [gtk::Button; 2],
    width_images: [gtk::Image; 2],
    /// the label next to the icon in the open sidebar
    width_label: gtk::Label,
    on_theme: RefCell<Option<Box<dyn Fn()>>>,
    /// the theme buttons, same layout as the reading width ones
    theme_buttons: [gtk::Button; 2],
    theme_images: [gtk::Image; 2],
    theme_label: gtk::Label,
    on_about: RefCell<Option<Box<dyn Fn()>>>,
}

/// a sidebar footer button : the icon alone in the rail, the icon then its label in the open sidebar
fn width_button(label: Option<&gtk::Label>) -> (gtk::Button, gtk::Image) {
    let image = gtk::Image::builder()
        .halign(gtk::Align::Center)
        .valign(gtk::Align::Center)
        .build();
    let button = gtk::Button::builder()
        .halign(gtk::Align::Center)
        .css_classes(["flat", "toc-hide", "toc-foot"])
        .build();
    if let Some(label) = label {
        let content = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        content.append(&image);
        content.append(label);
        button.set_child(Some(&content));
        button.add_css_class("toc-foot-wide");
    } else {
        button.set_child(Some(&image));
    }
    button.set_cursor_from_name(Some("pointer"));
    (button, image)
}

impl Toc {
    pub fn new() -> Rc<Self> {
        let title = gtk::Label::builder()
            .label("TABLE OF CONTENTS")
            .xalign(0.0)
            .hexpand(true)
            .css_classes(["toc-header"])
            .build();
        let collapse = gtk::Button::builder()
            .label("\u{25c0}")
            .css_classes(["flat", "toc-hide"])
            .build();
        let header = gtk::Box::new(gtk::Orientation::Horizontal, 0);
        header.append(&title);
        header.append(&collapse);
        let list = gtk::Box::builder()
            .orientation(gtk::Orientation::Vertical)
            .css_classes(["toc"])
            .build();
        let scrolled = gtk::ScrolledWindow::builder()
            .child(&list)
            .hscrollbar_policy(gtk::PolicyType::Never)
            .vexpand(true)
            .build();
        let full = gtk::Box::builder()
            .orientation(gtk::Orientation::Vertical)
            .css_classes(["sidebar"])
            .build();
        full.append(&header);
        full.append(&scrolled);
        let width_label = gtk::Label::new(None);
        let (full_width, full_image) = width_button(Some(&width_label));
        full.append(&full_width);
        let theme_label = gtk::Label::new(None);
        let (full_theme, full_theme_image) = width_button(Some(&theme_label));
        full.append(&full_theme);
        let about_label = gtk::Label::new(Some("About"));
        let (full_about, full_about_image) = width_button(Some(&about_label));
        full_about_image.set_icon_name(Some("help-about-symbolic"));
        full_about.set_tooltip_text(Some("About md-dit"));
        full.append(&full_about);
        let expand = gtk::Button::builder()
            .label("\u{25b6}")
            .halign(gtk::Align::Center)
            .css_classes(["flat", "toc-hide"])
            .build();
        let rail = gtk::Box::builder()
            .orientation(gtk::Orientation::Vertical)
            .width_request(RAIL_WIDTH)
            .css_classes(["sidebar", "toc-rail"])
            .build();
        rail.append(&expand);
        let (rail_width, rail_image) = width_button(None);
        rail_width.set_vexpand(true);
        rail_width.set_valign(gtk::Align::End);
        rail.append(&rail_width);
        let (rail_theme, rail_theme_image) = width_button(None);
        rail.append(&rail_theme);
        let (rail_about, rail_about_image) = width_button(None);
        rail_about_image.set_icon_name(Some("help-about-symbolic"));
        rail_about.set_tooltip_text(Some("About md-dit"));
        rail.append(&rail_about);
        let widget = gtk::Stack::builder()
            .hhomogeneous(false)
            .vhomogeneous(false)
            .transition_type(gtk::StackTransitionType::Crossfade)
            .transition_duration(ANIMATION_MS)
            .overflow(gtk::Overflow::Hidden)
            .hexpand(false)
            .build();
        widget.add_named(&full, Some("full"));
        widget.add_named(&rail, Some("rail"));
        widget.set_visible_child_name("rail");
        let toc = Rc::new(Self {
            widget,
            scrolled,
            header,
            list,
            rows: RefCell::new(Vec::new()),
            collapsed: RefCell::new(Vec::new()),
            active: Cell::new(None),
            open: Cell::new(false),
            tick: RefCell::new(None),
            on_select: RefCell::new(None),
            on_toggle: RefCell::new(None),
            on_fold: RefCell::new(None),
            on_width: RefCell::new(None),
            width_buttons: [full_width, rail_width],
            width_images: [full_image, rail_image],
            width_label,
            on_theme: RefCell::new(None),
            theme_buttons: [full_theme, rail_theme],
            theme_images: [full_theme_image, rail_theme_image],
            theme_label,
            on_about: RefCell::new(None),
        });
        for button in [&full_about, &rail_about] {
            let this = toc.clone();
            button.connect_clicked(move |_| {
                if let Some(on_about) = this.on_about.borrow().as_ref() {
                    on_about();
                }
            });
        }
        for button in &toc.theme_buttons {
            let this = toc.clone();
            button.connect_clicked(move |_| {
                if let Some(on_theme) = this.on_theme.borrow().as_ref() {
                    on_theme();
                }
            });
        }
        for button in &toc.width_buttons {
            let this = toc.clone();
            button.connect_clicked(move |_| {
                if let Some(on_width) = this.on_width.borrow().as_ref() {
                    on_width();
                }
            });
        }
        for (button, open) in [(collapse, false), (expand, true)] {
            // clickable, so the cursor says so
            button.set_cursor_from_name(Some("pointer"));
            let this = toc.clone();
            button.connect_clicked(move |_| {
                if let Some(on_toggle) = this.on_toggle.borrow().as_ref() {
                    on_toggle(open);
                }
            });
        }
        toc
    }

    /// set once the app exists, the callbacks need it
    pub fn set_callbacks(
        &self,
        on_select: impl Fn(usize) + 'static,
        on_toggle: impl Fn(bool) + 'static,
        on_fold: impl Fn() + 'static,
    ) {
        *self.on_select.borrow_mut() = Some(Box::new(on_select));
        *self.on_toggle.borrow_mut() = Some(Box::new(on_toggle));
        *self.on_fold.borrow_mut() = Some(Box::new(on_fold));
    }

    /// set once the app exists, called when the user clicks a reading width button
    pub fn set_width_callback(&self, on_width: impl Fn() + 'static) {
        *self.on_width.borrow_mut() = Some(Box::new(on_width));
    }

    /// shows the current reading width on the buttons, the icon and label say what it is and the tooltip what a click does
    pub fn set_width_icon(&self, icon: &str, label: &str, tooltip: &str) {
        for (button, image) in self.width_buttons.iter().zip(&self.width_images) {
            image.set_icon_name(Some(icon));
            button.set_tooltip_text(Some(tooltip));
        }
        self.width_label.set_label(label);
    }

    /// set once the app exists, called when the user clicks a theme button
    pub fn set_theme_callback(&self, on_theme: impl Fn() + 'static) {
        *self.on_theme.borrow_mut() = Some(Box::new(on_theme));
    }

    /// set once the app exists, called when the user clicks an about button
    pub fn set_about_callback(&self, on_about: impl Fn() + 'static) {
        *self.on_about.borrow_mut() = Some(Box::new(on_about));
    }

    /// shows the current theme on the buttons, the icon and label say what it is and the tooltip what a click does
    pub fn set_theme_icon(&self, icon: &str, label: &str, tooltip: &str) {
        for (button, image) in self.theme_buttons.iter().zip(&self.theme_images) {
            image.set_icon_name(Some(icon));
            button.set_tooltip_text(Some(tooltip));
        }
        self.theme_label.set_label(label);
    }

    pub fn is_open(&self) -> bool {
        self.open.get()
    }

    pub fn set_open(&self, open: bool) {
        self.open.set(open);
        self.widget
            .set_visible_child_name(if open { "full" } else { "rail" });
    }

    fn stop_animation(&self) {
        if let Some(tick) = self.tick.borrow_mut().take() {
            tick.remove();
        }
    }

    pub fn animating(&self) -> bool {
        self.tick.borrow().is_some()
    }

    /// sets the sidebar width at once
    pub fn set_width(&self, width: i32) {
        self.stop_animation();
        self.widget.set_width_request(width);
    }

    /// slides the sidebar from its current width to the given one
    pub fn animate_width(self: &Rc<Self>, to: i32) {
        self.stop_animation();
        let from = self.widget.width();
        if from <= 0 || from == to {
            self.widget.set_width_request(to);
            return;
        }
        let begin = Cell::new(None);
        let this = self.clone();
        let tick = self.widget.add_tick_callback(move |widget, clock| {
            let now = clock.frame_time();
            let start = begin.get().unwrap_or(now);
            begin.set(Some(start));
            let progress = ((now - start) as f64 / (f64::from(ANIMATION_MS) * 1000.0)).min(1.0);
            let width = f64::from(from) + f64::from(to - from) * crate::view::ease_out(progress);
            widget.set_width_request(width.round() as i32);
            if progress >= 1.0 {
                this.tick.borrow_mut().take();
                return gtk::glib::ControlFlow::Break;
            }
            gtk::glib::ControlFlow::Continue
        });
        *self.tick.borrow_mut() = Some(tick);
    }

    /// the narrowest and widest the sidebar may be in its current state : the rail has a single width, the open
    /// sidebar can be resized down to a minimum and up to the width of the longest label currently displayed (headings
    /// folded away do not count), no wider, past that there is nothing more to show
    pub fn bounds(&self) -> (i32, i32) {
        if self.open.get() {
            let min_width = self.header.measure(gtk::Orientation::Horizontal, -1).0;
            let widest = self
                .rows
                .borrow()
                .iter()
                .filter(|row| row.widget.is_visible())
                .map(|row| row.natural)
                .max()
                .unwrap_or(0);
            (min_width, (widest + WIDTH_SLACK).max(min_width))
        } else {
            (RAIL_WIDTH, RAIL_WIDTH)
        }
    }

    pub fn len(&self) -> usize {
        self.rows.borrow().len()
    }

    pub fn clear(&self) {
        while let Some(child) = self.list.first_child() {
            self.list.remove(&child);
        }
        self.rows.borrow_mut().clear();
        self.collapsed.borrow_mut().clear();
        self.active.set(None);
    }

    pub fn add(self: &Rc<Self>, level: usize, text: &str) {
        let index = self.len();
        let arrow = gtk::Label::builder()
            .label("")
            .width_chars(2)
            .margin_start(INDENT * (level as i32 - 1))
            .css_classes(["toc-arrow"])
            .build();
        let label = gtk::Label::builder()
            .label(text)
            .xalign(0.0)
            .hexpand(true)
            .ellipsize(gtk::pango::EllipsizeMode::End)
            .build();
        let widget = gtk::Box::builder().css_classes(["toc-row"]).build();
        widget.append(&arrow);
        widget.append(&label);
        let natural = widget.measure(gtk::Orientation::Horizontal, -1).1;
        let select = gtk::GestureClick::new();
        let this = self.clone();
        select.connect_released(move |_, _, _, _| {
            if let Some(on_select) = this.on_select.borrow().as_ref() {
                on_select(index);
            }
        });
        widget.add_controller(select);
        let fold = gtk::GestureClick::new();
        let this = self.clone();
        fold.connect_released(move |gesture, _, _, _| {
            gesture.set_state(gtk::EventSequenceState::Claimed);
            this.toggle(index);
        });
        arrow.add_controller(fold);
        // the nearest previous heading with a lower level is the parent, it gets an arrow
        if let Some(parent) = self
            .rows
            .borrow()
            .iter()
            .rev()
            .find(|row| row.level < level)
        {
            if !parent.has_children.replace(true) {
                parent.arrow.set_label("\u{25bc}");
            }
        }
        self.list.append(&widget);
        self.rows.borrow_mut().push(Row {
            widget,
            arrow,
            level,
            has_children: Cell::new(false),
            natural,
        });
        self.collapsed.borrow_mut().push(false);
        if self.collapsed.borrow().iter().any(|collapsed| *collapsed) {
            self.apply_visibility();
        }
    }

    fn toggle(&self, index: usize) {
        let folded = {
            let mut collapsed = self.collapsed.borrow_mut();
            collapsed[index] = !collapsed[index];
            collapsed[index]
        };
        if let Some(row) = self.rows.borrow().get(index) {
            row.arrow
                .set_label(if folded { "\u{25b6}" } else { "\u{25bc}" });
        }
        self.apply_visibility();
        // folding changes which labels are displayed, so the widest allowed width
        if let Some(on_fold) = self.on_fold.borrow().as_ref() {
            on_fold();
        }
    }

    fn apply_visibility(&self) {
        let (rows, collapsed) = (self.rows.borrow(), self.collapsed.borrow());
        let mut hidden_below: Option<usize> = None;
        for (row, folded) in rows.iter().zip(collapsed.iter()) {
            if let Some(level) = hidden_below {
                if row.level > level {
                    row.widget.set_visible(false);
                    continue;
                }
                hidden_below = None;
            }
            row.widget.set_visible(true);
            if *folded && row.has_children.get() {
                hidden_below = Some(row.level);
            }
        }
    }

    pub fn set_active(&self, index: Option<usize>) {
        if self.active.get() == index {
            return;
        }
        let rows = self.rows.borrow();
        // the row may not exist yet while the document is still loading, retry on the next call
        if index.is_some_and(|i| i >= rows.len()) {
            return;
        }
        if let Some(previous) = self.active.get().and_then(|i| rows.get(i)) {
            previous.widget.remove_css_class("active");
        }
        self.active.set(index);
        let Some(row) = index.and_then(|i| rows.get(i)) else {
            return;
        };
        row.widget.add_css_class("active");
        // keep the current heading in view when the document scrolls
        if let Some(bounds) = row.widget.compute_bounds(&self.list) {
            let adjustment = self.scrolled.vadjustment();
            let (top, bottom) = (
                f64::from(bounds.y()),
                f64::from(bounds.y() + bounds.height()),
            );
            if top < adjustment.value() {
                adjustment.set_value(top);
            } else if bottom > adjustment.value() + adjustment.page_size() {
                adjustment.set_value(bottom - adjustment.page_size());
            }
        }
    }
}
