//! a TextView that paints what tags can not : blockquote boxes with a left border and rules under headings

use std::{
    cell::{Cell, RefCell},
    rc::Rc,
};

use gtk::{gdk, glib, graphene, gsk, prelude::*, subclass::prelude::*};

#[derive(Clone)]
pub enum Kind {
    /// a blockquote at the given depth (1 is the outermost)
    Quote(i32),
    /// a thin rule right under the last line of the range
    Rule,
    /// a code block, its first line holds the header, nothing but that line shows while it is collapsed ; while it folds
    /// or unfolds the mark is where the lines still shown end
    Code(Rc<Cell<bool>>, Rc<RefCell<Option<gtk::TextMark>>>),
    /// a rounded pill behind inline code, one box per displayed line when it wraps
    Inline,
}

pub struct Decoration {
    pub kind: Kind,
    pub start: gtk::TextMark,
    pub end: gtk::TextMark,
}

pub type Decorations = Rc<RefCell<Vec<Decoration>>>;

/// slows down towards the end, `progress` and the result go from 0 to 1
pub fn ease_out(progress: f64) -> f64 {
    1.0 - (1.0 - progress).powi(3)
}

const QUOTE_BORDER: f32 = 4.0;
/// the pill behind inline code reaches this far beyond the text on each side
const PILL_PADDING: f32 = 0.0;
/// the pill is taller than the text by this much, split above and below
const PILL_GROW: f32 = 5.0;
/// the rule sits this far above the bottom of a heading, the rest is the space before what follows
const RULE_OFFSET: f32 = 18.0;

/// the parts of the layout the pills depend on : visible area, width, text size and total height
type Measure = (i32, i32, i32, i32, i32);

/// where a quote, rule or code block sits, measured outside of painting
#[derive(Clone, Copy, Default)]
pub struct Placed {
    top: i32,
    bottom: i32,
    head_height: i32,
    /// where the first hidden line of a code block being folded starts
    cut_top: Option<i32>,
}

mod imp {
    use super::*;

    #[derive(Default)]
    pub struct MdView {
        pub decorations: RefCell<Option<Decorations>>,
        pub dark: Cell<bool>,
        /// the pills behind inline code, in buffer coordinates, measured outside of painting
        pub pills: RefCell<Vec<graphene::Rect>>,
        /// what the pills were measured against, they are measured again when it changes
        pub measured: Cell<Option<Measure>>,
        pub measuring: Cell<bool>,
        /// one entry per decoration, in the same order
        pub placed: RefCell<Vec<Placed>>,
        /// the width the layout was last laid out for, and a counter that lets only the latest settle timer act
        pub last_width: Cell<i32>,
        pub resizing: Cell<bool>,
        pub generation: Cell<u32>,
    }

    #[glib::object_subclass]
    impl ObjectSubclass for MdView {
        const NAME: &'static str = "MdDitView";
        type Type = super::MdView;
        type ParentType = gtk::TextView;
    }

    impl ObjectImpl for MdView {}
    impl WidgetImpl for MdView {
        fn size_allocate(&self, width: i32, height: i32, baseline: i32) {
            self.parent_size_allocate(width, height, baseline);
            // boxes follow the new layout at once, they only ask for line positions
            self.measure_placed_now();
            if width != self.last_width.replace(width) {
                // asking for the position of characters while the width keeps changing leaves the layout with stale
                // lines (wrong styles, text out of place), so the pills are hidden until the width stops moving
                self.resizing.set(true);
                if !self.pills.borrow().is_empty() {
                    self.pills.borrow_mut().clear();
                    self.obj().queue_draw();
                }
                let generation = self.generation.get().wrapping_add(1);
                self.generation.set(generation);
                let view = self.obj().clone();
                glib::timeout_add_local_once(std::time::Duration::from_millis(150), move || {
                    let imp = view.imp();
                    if imp.generation.get() == generation {
                        imp.resizing.set(false);
                        imp.measure_now();
                    }
                });
            }
        }
    }

    impl TextViewImpl for MdView {
        fn snapshot_layer(&self, layer: gtk::TextViewLayer, snapshot: gtk::Snapshot) {
            if layer == gtk::TextViewLayer::BelowText {
                self.draw(&snapshot);
            }
            self.parent_snapshot_layer(layer, snapshot);
        }
    }

    fn snapshot_pill(dark: bool) -> (gdk::RGBA, gdk::RGBA) {
        if dark {
            (
                gdk::RGBA::new(0.169, 0.188, 0.22, 1.0),
                gdk::RGBA::new(1.0, 1.0, 1.0, 0.1),
            )
        } else {
            (
                gdk::RGBA::new(0.914, 0.929, 0.945, 1.0),
                gdk::RGBA::new(0.0, 0.0, 0.0, 0.1),
            )
        }
    }

    impl MdView {
        /// asking the layout for the position of characters builds layout lines. Doing that while the view is painted leaves
        /// it with stale lines (wrong styles, text out of place) once it scrolls to them, so pills are measured on idle
        /// and painted from that, they are measured again as soon as what they depend on moves
        fn measure_state(&self) -> Measure {
            let view = self.obj();
            let buffer = view.buffer();
            let visible = view.visible_rect();
            (
                visible.y(),
                visible.height(),
                view.width(),
                buffer.char_count(),
                view.vadjustment()
                    .map_or(0, |adjustment| adjustment.upper() as i32),
            )
        }

        fn queue_measure(&self) {
            if self.measuring.replace(true) {
                return;
            }
            let view = self.obj().clone();
            glib::idle_add_local_once(move || {
                view.imp().measuring.set(false);
                view.imp().measure_now();
            });
        }

        /// measures everything the painting needs. Painting itself must not ask the layout for anything : it builds lines
        /// on the spot, which leaves the view with stale ones (wrong styles, boxes and text out of place) after a resize
        pub fn measure_now(&self) {
            let view = self.obj();
            let state = self.measure_state();
            self.measured.set(Some(state));
            let pills = self.measure_pills();
            if *self.pills.borrow() != pills {
                *self.pills.borrow_mut() = pills;
                view.queue_draw();
            }
            self.measure_placed_now();
        }

        pub fn measure_placed_now(&self) {
            let placed = self.measure_placed();
            if !same_placed(&self.placed.borrow(), &placed) {
                *self.placed.borrow_mut() = placed;
                self.obj().queue_draw();
            }
        }

        fn measure_placed(&self) -> Vec<Placed> {
            let view = self.obj();
            let Some(decorations) = self.decorations.borrow().clone() else {
                return Vec::new();
            };
            let buffer = view.buffer();
            let decorations = decorations.borrow();
            decorations
                .iter()
                .map(|decoration| {
                    if matches!(decoration.kind, Kind::Inline) {
                        return Placed::default();
                    }
                    let start = buffer.iter_at_mark(&decoration.start);
                    let mut end = buffer.iter_at_mark(&decoration.end);
                    // the end mark sits after the final newline, step back onto the last line of the range
                    end.backward_char();
                    let (top, head_height) = view.line_yrange(&start);
                    let (last, last_height) = view.line_yrange(&end);
                    let cut_top = match &decoration.kind {
                        Kind::Code(_, cut) => cut
                            .borrow()
                            .as_ref()
                            .map(|cut| view.line_yrange(&buffer.iter_at_mark(cut)).0),
                        _ => None,
                    };
                    Placed {
                        top,
                        bottom: last + last_height,
                        head_height,
                        cut_top,
                    }
                })
                .collect()
        }

        /// a rounded box behind each displayed line of every inline code near the visible area
        fn measure_pills(&self) -> Vec<graphene::Rect> {
            let view = self.obj();
            let Some(decorations) = self.decorations.borrow().clone() else {
                return Vec::new();
            };
            let buffer = view.buffer();
            let visible = view.visible_rect();
            let (window_top, window_bottom) = (
                visible.y() - visible.height(),
                visible.y() + 2 * visible.height(),
            );
            let mut rects = Vec::new();
            for decoration in decorations
                .borrow()
                .iter()
                .filter(|decoration| matches!(decoration.kind, Kind::Inline))
            {
                let (start, end) = (
                    buffer.iter_at_mark(&decoration.start),
                    buffer.iter_at_mark(&decoration.end),
                );
                let (first_top, _) = view.line_yrange(&start);
                let (last_top, last_height) = view.line_yrange(&end);
                if last_top + last_height < window_top || first_top > window_bottom {
                    continue;
                }
                // one box per displayed line, found by walking the characters : the line-walking calls of the view
                // (forward_display_line...) leave the layout with stale lines when used while it is being resized
                let mut current = start;
                let mut line: Option<(i32, i32, i32, i32)> = None;
                while current.offset() < end.offset() {
                    let at = view.iter_location(&current);
                    match &mut line {
                        Some((y, _, right, _)) if *y == at.y() => *right = at.x() + at.width(),
                        _ => {
                            if let Some((y, left, right, height)) = line.take() {
                                rects.push(pill(left, right, y, height));
                            }
                            line = Some((at.y(), at.x(), at.x() + at.width(), at.height()));
                        }
                    }
                    if !current.forward_char() {
                        break;
                    }
                }
                if let Some((y, left, right, height)) = line {
                    rects.push(pill(left, right, y, height));
                }
            }
            rects
        }

        fn draw_pills(&self, snapshot: &gtk::Snapshot) {
            if !self.resizing.get() && self.measured.get() != Some(self.measure_state()) {
                self.queue_measure();
            }
            let (colour, border) = snapshot_pill(self.dark.get());
            for rect in self.pills.borrow().iter() {
                let outline = gsk::RoundedRect::from_rect(*rect, 5.0);
                snapshot.push_rounded_clip(&outline);
                snapshot.append_color(&colour, rect);
                snapshot.pop();
                snapshot.append_border(&outline, &[1.0; 4], &[border; 4]);
            }
        }

        fn draw(&self, snapshot: &gtk::Snapshot) {
            let view = self.obj();
            let Some(decorations) = self.decorations.borrow().clone() else {
                return;
            };
            let dark = self.dark.get();
            let (left, right) = (
                view.left_margin() as f32,
                (view.width() - view.right_margin()) as f32,
            );
            let (quote_background, quote_border, rule) = if dark {
                (
                    gdk::RGBA::new(0.22, 0.55, 0.99, 0.14),
                    gdk::RGBA::new(0.22, 0.55, 0.99, 1.0),
                    gdk::RGBA::new(1.0, 1.0, 1.0, 0.14),
                )
            } else {
                (
                    gdk::RGBA::new(0.87, 0.96, 1.0, 1.0),
                    gdk::RGBA::new(0.04, 0.41, 0.85, 1.0),
                    gdk::RGBA::new(0.0, 0.0, 0.0, 0.14),
                )
            };
            let (code_background, code_head, code_border) = if dark {
                (
                    gdk::RGBA::new(0.125, 0.157, 0.2, 1.0),
                    gdk::RGBA::new(1.0, 1.0, 1.0, 0.05),
                    gdk::RGBA::new(1.0, 1.0, 1.0, 0.14),
                )
            } else {
                (
                    gdk::RGBA::new(0.949, 0.957, 0.965, 1.0),
                    gdk::RGBA::new(0.0, 0.0, 0.0, 0.04),
                    gdk::RGBA::new(0.0, 0.0, 0.0, 0.14),
                )
            };
            let mut pills_drawn = false;
            let decorations = decorations.borrow();
            // outer quotes first, so that nested ones are painted over them
            let placed = self.placed.borrow();
            let mut ordered: Vec<(usize, &Decoration)> = decorations.iter().enumerate().collect();
            ordered.sort_by_key(|(_, decoration)| match &decoration.kind {
                Kind::Quote(depth) => *depth,
                Kind::Rule => 0,
                Kind::Code(..) => i32::MAX,
                Kind::Inline => i32::MAX - 1,
            });
            for (index, decoration) in ordered {
                if matches!(decoration.kind, Kind::Inline) {
                    // pills go over the quotes and under the code blocks, the order of the sort
                    if !std::mem::replace(&mut pills_drawn, true) {
                        self.draw_pills(snapshot);
                    }
                    continue;
                }
                let Some(spot) = placed.get(index) else {
                    continue;
                };
                let (top, bottom) = (spot.top, spot.bottom as f32);
                match &decoration.kind {
                    Kind::Quote(depth) => {
                        let inset = crate::render::QUOTE_INDENT as f32 * (*depth - 1) as f32;
                        let rect = graphene::Rect::new(
                            left + inset,
                            top as f32,
                            right - left - inset,
                            bottom - top as f32,
                        );
                        snapshot.push_rounded_clip(&gsk::RoundedRect::from_rect(rect, 6.0));
                        snapshot.append_color(&quote_background, &rect);
                        snapshot.append_color(
                            &quote_border,
                            &graphene::Rect::new(rect.x(), rect.y(), QUOTE_BORDER, rect.height()),
                        );
                        snapshot.pop();
                    }
                    Kind::Code(collapsed, cut) => {
                        let (head_top, head_height) = (top, spot.head_height);
                        let bottom = if collapsed.get() {
                            (head_top + head_height) as f32
                        } else if let Some(cut_top) =
                            spot.cut_top.filter(|_| cut.borrow().is_some())
                        {
                            // the first hidden line starts where the last shown one ends
                            cut_top as f32
                        } else {
                            bottom
                        };
                        let rect = graphene::Rect::new(
                            left,
                            head_top as f32,
                            right - left,
                            bottom - head_top as f32,
                        );
                        let outline = gsk::RoundedRect::from_rect(rect, 8.0);
                        snapshot.push_rounded_clip(&outline);
                        snapshot.append_color(&code_background, &rect);
                        snapshot.append_color(
                            &code_head,
                            &graphene::Rect::new(
                                rect.x(),
                                rect.y(),
                                rect.width(),
                                head_height as f32,
                            ),
                        );
                        if !collapsed.get() {
                            snapshot.append_color(
                                &code_border,
                                &graphene::Rect::new(
                                    rect.x(),
                                    rect.y() + head_height as f32,
                                    rect.width(),
                                    1.0,
                                ),
                            );
                        }
                        snapshot.pop();
                        snapshot.append_border(&outline, &[1.0; 4], &[code_border; 4]);
                    }
                    Kind::Inline => {}
                    Kind::Rule => {
                        snapshot.append_color(
                            &rule,
                            &graphene::Rect::new(left, bottom - RULE_OFFSET, right - left, 1.0),
                        );
                    }
                }
            }
        }
    }
}

fn pill(left: i32, right: i32, y: i32, height: i32) -> graphene::Rect {
    graphene::Rect::new(
        left as f32 - PILL_PADDING,
        y as f32 - PILL_GROW / 2.0,
        (right - left) as f32 + 2.0 * PILL_PADDING,
        height as f32 + PILL_GROW,
    )
}

fn same_placed(a: &[Placed], b: &[Placed]) -> bool {
    a.len() == b.len()
        && a.iter().zip(b).all(|(a, b)| {
            (a.top, a.bottom, a.head_height, a.cut_top)
                == (b.top, b.bottom, b.head_height, b.cut_top)
        })
}

glib::wrapper! {
    pub struct MdView(ObjectSubclass<imp::MdView>)
        @extends gtk::TextView, gtk::Widget,
        @implements gtk::Accessible, gtk::Buildable, gtk::ConstraintTarget, gtk::Scrollable;
}

impl MdView {
    pub fn new(decorations: Decorations) -> Self {
        let view: Self = glib::Object::new();
        *view.imp().decorations.borrow_mut() = Some(decorations);
        view
    }

    /// lets the header buttons of a code block repaint the box around it
    pub fn repaint(&self) {
        self.imp().measure_placed_now();
        self.queue_draw();
    }

    pub fn set_dark(&self, dark: bool) {
        self.imp().dark.set(dark);
        self.queue_draw();
    }
}
