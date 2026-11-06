use std::{
    cell::{Cell, RefCell},
    collections::HashMap,
    ops::Range,
    path::{Path, PathBuf},
    rc::Rc,
    sync::mpsc,
};

use gtk::prelude::*;
use pulldown_cmark::{Alignment, CodeBlockKind, Event, HeadingLevel, Options, Parser, Tag, TagEnd};

use crate::{
    highlight::{self, Job, Span},
    view::{Decoration, Decorations, Kind},
};

/// source bytes rendered before the window is shown, the rest streams in afterwards
const HEAD_BYTES: usize = 4 * 1024;
/// source bytes per chunk, small enough to never block the main loop for long
const CHUNK_BYTES: usize = 16 * 1024;
pub const QUOTE_INDENT: i32 = 20;
/// quote text wraps this far inside the quote box
const QUOTE_PADDING: i32 = 12;
/// space between the top of the quote box and its first line, the bottom gets as much from the paragraph spacing
const QUOTE_TOP_PADDING: i32 = 14;
const ITEM_INDENT: i32 = 22;
const BULLET_HANG: i32 = 18;
const CODE_INDENT: i32 = 14;
/// room between the header of a code block and its first line, and under its last line
const CODE_PADDING: i32 = 19;
/// code blocks coloured per poll, so that a big document never freezes the window
const HIGHLIGHTS_PER_POLL: usize = 40;

struct Palette {
    heading: &'static str,
    muted: &'static str,
    code_text: &'static str,
    link: &'static str,
    link_hover: &'static str,
}

const LIGHT: Palette = Palette {
    heading: "#1f2328",
    muted: "#59636e",
    code_text: "#0550ae",
    link: "#0969da",
    link_hover: "#0b5fff",
};
const DARK: Palette = Palette {
    heading: "#f0f6fc",
    muted: "#9198a1",
    code_text: "#58a6ff",
    link: "#4493f8",
    link_hover: "#79c0ff",
};

struct Table {
    /// every cell is pango markup, so that bold, italic, code and links survive
    rows: Vec<Vec<String>>,
    header_rows: usize,
    aligns: Vec<Alignment>,
    cell: Option<String>,
}

pub struct Heading {
    pub level: usize,
    pub text: String,
    pub mark: gtk::TextMark,
}

pub enum ImageSource {
    Local(PathBuf),
    Remote(String),
}

pub struct PendingImage {
    pub start: gtk::TextMark,
    pub end: gtk::TextMark,
    pub source: ImageSource,
}

/// a table waits for the view to give it a scrollable widget at its anchor
pub struct PendingTable {
    pub anchor: gtk::TextChildAnchor,
    pub rows: Vec<Vec<String>>,
    pub header_rows: usize,
    pub aligns: Vec<Alignment>,
}

/// a code block waits for the view to give its header (language, copy, expand, collapse) a widget at its anchor
#[derive(Clone)]
pub struct PendingCode {
    pub anchor: gtk::TextChildAnchor,
    pub language: String,
    /// the code itself, from here to `end`
    pub start: gtk::TextMark,
    pub end: gtk::TextMark,
    pub collapsed: Rc<Cell<bool>>,
    /// where the lines still shown end while the block folds or unfolds
    pub cut: Rc<RefCell<Option<gtk::TextMark>>>,
    /// hides the code, applied over `start..end` while the block is collapsed
    pub hidden: gtk::TextTag,
    /// what only makes sense inside the document, removed from the copy shown in the modal
    pub plain: Vec<gtk::TextTag>,
}

struct SyntaxTag {
    tag: gtk::TextTag,
    light: u32,
    dark: u32,
}

pub struct Renderer {
    buffer: gtk::TextBuffer,
    // the events borrow from `source`, declared after them so that they drop first
    events: Vec<(Event<'static>, Range<usize>)>,
    source: Box<str>,
    dir: PathBuf,
    /// event index where each chunk starts, the last entry is the end of the stream
    bounds: Vec<usize>,
    chunk: usize,
    headings_tags: Vec<gtk::TextTag>,
    bold: gtk::TextTag,
    italic: gtk::TextTag,
    strike: gtk::TextTag,
    code: gtk::TextTag,
    link: gtk::TextTag,
    link_hover: gtk::TextTag,
    hovered: Cell<Option<(i32, i32)>>,
    paragraph: gtk::TextTag,
    code_block: gtk::TextTag,
    code_head: gtk::TextTag,
    code_first: gtk::TextTag,
    code_last: gtk::TextTag,
    hidden: gtk::TextTag,
    muted: gtk::TextTag,
    superscript: gtk::TextTag,
    spacer: gtk::TextTag,
    quote_gap: gtk::TextTag,
    items: Vec<gtk::TextTag>,
    quotes: Vec<gtk::TextTag>,
    syntax_tags: HashMap<(u32, u32, bool, bool), SyntaxTag>,
    inline: Vec<gtk::TextTag>,
    block: Vec<gtk::TextTag>,
    lists: Vec<Option<u64>>,
    pending_bullet: Option<String>,
    link_starts: Vec<(gtk::TextMark, String)>,
    links: Vec<(gtk::TextMark, gtk::TextMark, String)>,
    image_starts: Vec<(gtk::TextMark, String)>,
    decorations: Decorations,
    quote_starts: Vec<(gtk::TextMark, i32)>,
    images: Vec<PendingImage>,
    tables: Vec<PendingTable>,
    headings: Vec<Heading>,
    heading_text: Option<(usize, String, gtk::TextMark)>,
    code_marks: HashMap<usize, gtk::TextMark>,
    codes: Vec<PendingCode>,
    code_open: Option<(gtk::TextMark, gtk::TextChildAnchor, String)>,
    code_sequence: usize,
    highlights: HashMap<usize, Vec<Span>>,
    highlight_receiver: Option<mpsc::Receiver<(usize, Vec<Span>)>>,
    highlight_jobs: Vec<Job>,
    table: Option<Table>,
    at_line_start: bool,
    dark: Cell<bool>,
    /// the view margin, tag margins are absolute in GTK so they have to include it
    margin: Cell<i32>,
}

fn tag(buffer: &gtk::TextBuffer, properties: &[(&str, &dyn ToValue)]) -> gtk::TextTag {
    buffer
        .create_tag(None, properties)
        .expect("anonymous tags are always created")
}

fn language_token(language: &str) -> &str {
    language.split([' ', ',', '{']).next().unwrap_or_default()
}

/// only web images are fetched, any other scheme (file:, data:, ...) is never loaded
fn is_remote(url: &str) -> bool {
    let scheme = url.split_once("://").map_or("", |(scheme, _)| scheme);
    scheme.eq_ignore_ascii_case("http") || scheme.eq_ignore_ascii_case("https")
}

/// a relative image path resolved inside `dir` (canonical), never a remote url, a missing file, a special file or a path escaping `dir`
fn confine(dir: &Path, url: &str) -> Option<PathBuf> {
    if url.contains("://") || url.starts_with("data:") {
        return None;
    }
    let decoded = url.replace("%20", " ");
    let path = dir.join(decoded).canonicalize().ok()?;
    (path.starts_with(dir) && path.is_file()).then_some(path)
}

impl Renderer {
    pub fn new(
        buffer: &gtk::TextBuffer,
        source: Box<str>,
        dir: &Path,
        dark: bool,
        base_margin: i32,
        decorations: Decorations,
    ) -> Self {
        // scale, space above, space below : H1 and H2 get a rule painted under the text, so more room below
        let levels: [(f64, i32, i32); 6] = [
            (2.0, 22, 28),
            (1.55, 24, 28),
            (1.25, 20, 12),
            (1.1, 16, 10),
            (1.0, 14, 8),
            (0.9, 14, 8),
        ];
        let headings_tags = levels
            .iter()
            .map(|(size, above, below)| {
                tag(
                    buffer,
                    &[
                        ("scale", size),
                        ("weight", &700),
                        ("pixels-above-lines", above),
                        ("pixels-below-lines", below),
                    ],
                )
            })
            .collect();
        let mut renderer = Self {
            buffer: buffer.clone(),
            events: Vec::new(),
            source: Box::from(""),
            dir: dir.to_path_buf(),
            bounds: Vec::new(),
            chunk: 0,
            headings_tags,
            bold: tag(buffer, &[("weight", &700)]),
            italic: tag(buffer, &[("style", &gtk::pango::Style::Italic)]),
            strike: tag(buffer, &[("strikethrough", &true)]),
            code: tag(buffer, &[("family", &"monospace"), ("scale", &0.9)]),
            link: tag(buffer, &[("underline", &gtk::pango::Underline::Single)]),
            link_hover: tag(buffer, &[]),
            hovered: Cell::new(None),
            paragraph: tag(
                buffer,
                &[("pixels-below-lines", &14), ("pixels-inside-wrap", &4)],
            ),
            code_block: tag(
                buffer,
                &[
                    ("family", &"monospace"),
                    ("scale", &0.9),
                    ("left-margin", &(base_margin + CODE_INDENT)),
                    ("right-margin", &(base_margin + CODE_INDENT)),
                    ("pixels-above-lines", &1),
                    ("pixels-below-lines", &1),
                ],
            ),
            code_head: tag(
                buffer,
                &[
                    ("left-margin", &base_margin),
                    ("right-margin", &base_margin),
                    ("pixels-above-lines", &6),
                    ("pixels-below-lines", &0),
                ],
            ),
            code_first: tag(buffer, &[("pixels-above-lines", &CODE_PADDING)]),
            code_last: tag(buffer, &[("pixels-below-lines", &CODE_PADDING)]),
            hidden: tag(buffer, &[("invisible", &true)]),
            muted: tag(buffer, &[]),
            superscript: tag(buffer, &[("scale", &0.75), ("rise", &4096)]),
            spacer: tag(buffer, &[("scale", &0.4)]),
            quote_gap: tag(buffer, &[("scale", &1.5)]),
            items: Vec::new(),
            quotes: Vec::new(),
            syntax_tags: HashMap::new(),
            inline: Vec::new(),
            block: Vec::new(),
            lists: Vec::new(),
            pending_bullet: None,
            link_starts: Vec::new(),
            links: Vec::new(),
            image_starts: Vec::new(),
            decorations,
            quote_starts: Vec::new(),
            images: Vec::new(),
            tables: Vec::new(),
            headings: Vec::new(),
            heading_text: None,
            code_marks: HashMap::new(),
            codes: Vec::new(),
            code_open: None,
            code_sequence: 0,
            highlights: HashMap::new(),
            highlight_receiver: None,
            highlight_jobs: Vec::new(),
            table: None,
            at_line_start: true,
            dark: Cell::new(dark),
            margin: Cell::new(base_margin),
        };
        renderer.apply_palette(dark);
        renderer.load(source);
        renderer
    }

    /// replaces the document, the tags are kept so that reloading never grows the tag table
    pub fn load(&mut self, source: Box<str>) {
        self.clear();
        let options = Options::ENABLE_TABLES
            | Options::ENABLE_FOOTNOTES
            | Options::ENABLE_STRIKETHROUGH
            | Options::ENABLE_TASKLISTS
            | Options::ENABLE_SMART_PUNCTUATION;
        // SAFETY: the events only borrow from the boxed source, whose heap data never moves, and `events` is
        // replaced (so dropped) before the old source is
        let text: &'static str = unsafe { &*(source.as_ref() as *const str) };
        let events: Vec<(Event<'static>, Range<usize>)> =
            Parser::new_ext(text, options).into_offset_iter().collect();
        let mut bounds = Vec::new();
        let (mut depth, mut next_cut) = (0usize, HEAD_BYTES);
        for (index, (event, range)) in events.iter().enumerate() {
            if depth == 0
                && range.start >= next_cut
                && matches!(event, Event::Start(_) | Event::Rule)
            {
                bounds.push(index);
                next_cut = range.start + CHUNK_BYTES;
            }
            match event {
                Event::Start(_) => depth += 1,
                Event::End(_) => depth -= 1,
                _ => {}
            }
        }
        bounds.push(events.len());
        let jobs = Self::code_jobs(&events);
        self.events = events;
        self.source = source;
        self.bounds = bounds;
        self.highlight_jobs = jobs;
    }

    /// starts the highlighter thread, called once the first frame is out so that it never competes with it
    pub fn start_highlight(&mut self) {
        let jobs = std::mem::take(&mut self.highlight_jobs);
        if !jobs.is_empty() && self.highlight_receiver.is_none() {
            self.highlight_receiver = Some(highlight::spawn(jobs));
        }
    }

    fn code_jobs(events: &[(Event<'static>, Range<usize>)]) -> Vec<Job> {
        let mut jobs = Vec::new();
        let (mut index, mut current): (usize, Option<(usize, String, String)>) = (0, None);
        for (event, _) in events {
            match event {
                Event::Start(Tag::CodeBlock(kind)) => {
                    let language = match kind {
                        CodeBlockKind::Fenced(language) => language_token(language).to_string(),
                        CodeBlockKind::Indented => String::new(),
                    };
                    current = Some((index, language, String::new()));
                    index += 1;
                }
                Event::Text(text) => {
                    if let Some((_, _, code)) = current.as_mut() {
                        code.push_str(text);
                    }
                }
                Event::End(TagEnd::CodeBlock) => {
                    if let Some((index, language, code)) = current.take() {
                        if !language.is_empty() {
                            jobs.push(Job {
                                index,
                                language,
                                code,
                            });
                        }
                    }
                }
                _ => {}
            }
        }
        jobs
    }

    fn clear(&mut self) {
        self.buffer.set_text("");
        let decoration_marks: Vec<gtk::TextMark> = self
            .decorations
            .borrow_mut()
            .drain(..)
            .flat_map(|decoration| [decoration.start, decoration.end])
            .collect();
        let marks = self
            .headings
            .drain(..)
            .map(|heading| heading.mark)
            .chain(
                self.links
                    .drain(..)
                    .flat_map(|(start, end, _)| [start, end]),
            )
            .chain(self.link_starts.drain(..).map(|(mark, _)| mark))
            .chain(self.image_starts.drain(..).map(|(mark, _)| mark))
            .chain(
                self.images
                    .drain(..)
                    .flat_map(|image| [image.start, image.end]),
            )
            .chain(self.code_marks.drain().map(|(_, mark)| mark))
            .chain(decoration_marks)
            .chain(self.quote_starts.drain(..).map(|(mark, _)| mark))
            .chain(self.heading_text.take().map(|(_, _, mark)| mark));
        for mark in marks {
            // a heading mark is shared with its rule decoration, so it may already be gone
            if !mark.is_deleted() {
                self.buffer.delete_mark(&mark);
            }
        }
        self.chunk = 0;
        self.code_sequence = 0;
        self.highlights.clear();
        self.highlight_receiver = None;
        self.highlight_jobs.clear();
        self.tables.clear();
        self.codes.clear();
        self.code_open = None;
        self.inline.clear();
        self.block.clear();
        self.lists.clear();
        self.pending_bullet = None;
        self.table = None;
        self.at_line_start = true;
    }

    fn palette(&self) -> Palette {
        if self.dark.get() {
            DARK
        } else {
            LIGHT
        }
    }

    pub fn apply_palette(&self, dark: bool) {
        self.dark.set(dark);
        let palette = self.palette();
        self.muted.set_foreground(Some(palette.muted));
        for heading in &self.headings_tags {
            heading.set_foreground(Some(palette.heading));
        }
        self.link.set_foreground(Some(palette.link));
        self.link_hover.set_foreground(Some(palette.link_hover));
        self.code.set_foreground(Some(palette.code_text));
        for syntax in self.syntax_tags.values() {
            syntax.tag.set_foreground(Some(&format!(
                "#{:06x}",
                if dark { syntax.dark } else { syntax.light }
            )));
        }
    }

    /// follows the view margin when the window is resized
    pub fn set_margin(&self, margin: i32) {
        self.margin.set(margin);
        for (level, item) in self.items.iter().enumerate() {
            item.set_left_margin(margin + ITEM_INDENT * (level as i32 + 1));
        }
        for (level, quote) in self.quotes.iter().enumerate() {
            quote.set_left_margin(margin + QUOTE_INDENT * (level as i32 + 1));
            quote.set_right_margin(margin + QUOTE_PADDING);
        }
        self.code_block.set_left_margin(margin + CODE_INDENT);
        self.code_block.set_right_margin(margin + CODE_INDENT);
        self.code_head.set_left_margin(margin);
        self.code_head.set_right_margin(margin);
    }

    pub fn link_at(&self, offset: i32) -> Option<String> {
        self.links
            .iter()
            .find(|(start, end, _)| {
                (self.buffer.iter_at_mark(start).offset()..self.buffer.iter_at_mark(end).offset())
                    .contains(&offset)
            })
            .map(|(_, _, url)| url.clone())
    }

    /// the end marks of the links wrapping the text `start..end`, a badge is an image inside a link
    pub fn link_ends_around(&self, start: i32, end: i32) -> Vec<gtk::TextMark> {
        self.links
            .iter()
            .filter(|(link_start, link_end, _)| {
                self.buffer.iter_at_mark(link_start).offset() <= start
                    && self.buffer.iter_at_mark(link_end).offset() == end
            })
            .map(|(_, link_end, _)| link_end.clone())
            .collect()
    }

    /// highlights the link at `offset` and clears the previous one, `None` clears everything
    pub fn hover_link(&self, offset: Option<i32>) {
        let range = offset.and_then(|offset| {
            self.links
                .iter()
                .map(|(start, end, _)| {
                    (
                        self.buffer.iter_at_mark(start).offset(),
                        self.buffer.iter_at_mark(end).offset(),
                    )
                })
                .find(|(start, end)| (*start..*end).contains(&offset))
        });
        if range == self.hovered.get() {
            return;
        }
        if let Some((start, end)) = self.hovered.replace(range) {
            self.buffer.remove_tag(
                &self.link_hover,
                &self.buffer.iter_at_offset(start),
                &self.buffer.iter_at_offset(end),
            );
        }
        if let Some((start, end)) = range {
            self.buffer.apply_tag(
                &self.link_hover,
                &self.buffer.iter_at_offset(start),
                &self.buffer.iter_at_offset(end),
            );
        }
    }

    pub fn headings(&self) -> &[Heading] {
        &self.headings
    }

    pub fn take_tables(&mut self) -> Vec<PendingTable> {
        std::mem::take(&mut self.tables)
    }

    pub fn take_codes(&mut self) -> Vec<PendingCode> {
        std::mem::take(&mut self.codes)
    }

    pub fn take_images(&mut self) -> Vec<PendingImage> {
        std::mem::take(&mut self.images)
    }

    /// true while code blocks are still waiting to be coloured
    pub fn highlight_pending(&self) -> bool {
        self.highlight_receiver.is_some()
            || !self.highlight_jobs.is_empty()
            || !self.highlights.is_empty()
    }

    /// receives what the highlighter thread produced and colours the code blocks already in the buffer
    pub fn poll_highlight(&mut self) {
        if let Some(receiver) = &self.highlight_receiver {
            loop {
                match receiver.try_recv() {
                    Ok((index, spans)) => {
                        self.highlights.insert(index, spans);
                    }
                    Err(mpsc::TryRecvError::Empty) => break,
                    Err(mpsc::TryRecvError::Disconnected) => {
                        self.highlight_receiver = None;
                        break;
                    }
                }
            }
        }
        let mut ready: Vec<usize> = self
            .highlights
            .keys()
            .copied()
            .filter(|index| self.code_marks.contains_key(index))
            .collect();
        ready.sort_unstable();
        for index in ready.into_iter().take(HIGHLIGHTS_PER_POLL) {
            if let (Some(spans), Some(mark)) = (
                self.highlights.remove(&index),
                self.code_marks.get(&index).cloned(),
            ) {
                self.colour(&mark, &spans);
            }
        }
        // blocks that were never rendered (or have no syntax) must not keep the loader waiting
        if self.highlight_receiver.is_none() && self.chunk >= self.bounds.len() {
            self.highlights
                .retain(|index, _| self.code_marks.contains_key(index));
        }
    }

    fn colour(&mut self, mark: &gtk::TextMark, spans: &[Span]) {
        let base = self.buffer.iter_at_mark(mark).offset();
        for span in spans {
            let key = (span.light, span.dark, span.bold, span.italic);
            if !self.syntax_tags.contains_key(&key) {
                let weight = if span.bold { 700 } else { 400 };
                let style = if span.italic {
                    gtk::pango::Style::Italic
                } else {
                    gtk::pango::Style::Normal
                };
                let created = tag(&self.buffer, &[("weight", &weight), ("style", &style)]);
                created.set_foreground(Some(&format!(
                    "#{:06x}",
                    if self.dark.get() {
                        span.dark
                    } else {
                        span.light
                    }
                )));
                self.syntax_tags.insert(
                    key,
                    SyntaxTag {
                        tag: created,
                        light: span.light,
                        dark: span.dark,
                    },
                );
            }
            let syntax = &self.syntax_tags[&key];
            let (start, end) = (
                self.buffer.iter_at_offset(base + span.start),
                self.buffer.iter_at_offset(base + span.end),
            );
            self.buffer.apply_tag(&syntax.tag, &start, &end);
        }
    }

    /// renders the next chunk, returns false once the whole document is in the buffer
    pub fn render_next(&mut self) -> bool {
        if self.chunk >= self.bounds.len() {
            return false;
        }
        let from = if self.chunk == 0 {
            0
        } else {
            self.bounds[self.chunk - 1]
        };
        let to = self.bounds[self.chunk];
        self.chunk += 1;
        for index in from..to {
            let event = self.events[index].0.clone();
            self.event(event);
        }
        self.chunk < self.bounds.len()
    }

    fn item_tag(&mut self, depth: usize) -> gtk::TextTag {
        while self.items.len() <= depth {
            let level = self.items.len() as i32;
            let margin = self.margin.get() + ITEM_INDENT * (level + 1);
            let created = tag(
                &self.buffer,
                &[
                    ("left-margin", &margin),
                    ("indent", &-BULLET_HANG),
                    ("pixels-below-lines", &8),
                    ("pixels-inside-wrap", &4),
                ],
            );
            self.items.push(created);
        }
        self.items[depth].clone()
    }

    fn quote_tag(&mut self, depth: usize) -> gtk::TextTag {
        while self.quotes.len() < depth {
            let margin = self.margin.get() + QUOTE_INDENT * (self.quotes.len() as i32 + 1);
            let created = tag(
                &self.buffer,
                &[
                    ("left-margin", &margin),
                    ("right-margin", &(self.margin.get() + QUOTE_PADDING)),
                    ("pixels-above-lines", &QUOTE_TOP_PADDING),
                ],
            );
            self.quotes.push(created);
        }
        self.quotes[depth - 1].clone()
    }

    fn write(&mut self, text: &str, with_inline: bool, extra: &[&gtk::TextTag]) {
        if text.is_empty() {
            return;
        }
        let mut tags: Vec<&gtk::TextTag> = self.block.iter().collect();
        if with_inline {
            tags.extend(self.inline.iter());
        }
        tags.extend(extra.iter().copied());
        let mut end = self.buffer.end_iter();
        self.buffer.insert_with_tags(&mut end, text, &tags);
        self.at_line_start = text.ends_with('\n');
    }

    fn insert(&mut self, text: &str) {
        if self.cell_push(&gtk::glib::markup_escape_text(text)) {
            return;
        }
        if let Some((_, heading, _)) = self.heading_text.as_mut() {
            heading.push_str(text);
        }
        if let Some(bullet) = self.pending_bullet.take() {
            self.write(&bullet, false, &[]);
        }
        self.write(text, true, &[]);
    }

    /// appends pango markup to the table cell being read, false when not inside one
    fn cell_push(&mut self, markup: &str) -> bool {
        match self.table.as_mut().and_then(|table| table.cell.as_mut()) {
            Some(cell) => {
                cell.push_str(markup);
                true
            }
            None => false,
        }
    }

    fn end_line(&mut self) {
        if !self.at_line_start {
            self.write("\n", false, &[]);
        }
    }

    fn gap(&mut self) {
        let spacer = self.spacer.clone();
        self.write("\n", false, &[&spacer]);
    }

    fn mark(&self) -> gtk::TextMark {
        self.buffer.create_mark(None, &self.buffer.end_iter(), true)
    }

    fn event(&mut self, event: Event<'static>) {
        match event {
            Event::Start(tag) => self.start(tag),
            Event::End(tag) => self.end(tag),
            Event::Text(text) => self.insert(&text),
            Event::Code(text)
                if self.cell_push(&format!(
                    "<tt>{}</tt>",
                    gtk::glib::markup_escape_text(&text)
                )) => {}
            Event::Code(text) => {
                self.inline.push(self.code.clone());
                // the pill must not cover a list bullet that is about to be written
                if let Some(bullet) = self.pending_bullet.take() {
                    self.write(&bullet, false, &[]);
                }
                let start = self.mark();
                // a no-break space on each side is the padding inside the pill
                self.write("\u{a0}", true, &[]);
                self.insert(&text);
                self.write("\u{a0}", true, &[]);
                let end = self.mark();
                self.decorations.borrow_mut().push(Decoration {
                    kind: Kind::Inline,
                    start,
                    end,
                });
                self.inline.pop();
            }
            Event::SoftBreak => self.insert(" "),
            Event::HardBreak => self.insert("\n"),
            Event::Rule => {
                let muted = self.muted.clone();
                self.write(&"\u{2500}".repeat(48), false, &[&muted]);
                self.write("\n", false, &[]);
            }
            Event::TaskListMarker(checked) => {
                self.pending_bullet = Some(if checked { "\u{2611} " } else { "\u{2610} " }.into())
            }
            Event::FootnoteReference(label) => {
                self.inline.push(self.superscript.clone());
                self.insert(&format!("[{label}]"));
                self.inline.pop();
            }
            _ => {}
        }
    }

    fn start(&mut self, tag: Tag<'static>) {
        match tag {
            Tag::Paragraph => self.block.push(self.paragraph.clone()),
            Tag::Heading { level, .. } => {
                let index = match level {
                    HeadingLevel::H1 => 0,
                    HeadingLevel::H2 => 1,
                    HeadingLevel::H3 => 2,
                    HeadingLevel::H4 => 3,
                    HeadingLevel::H5 => 4,
                    HeadingLevel::H6 => 5,
                };
                self.heading_text = Some((index + 1, String::new(), self.mark()));
                self.block.push(self.headings_tags[index].clone());
            }
            Tag::BlockQuote(_) => {
                let depth = self
                    .block
                    .iter()
                    .filter(|t| self.quotes.contains(t))
                    .count()
                    + 1;
                let quote = self.quote_tag(depth);
                self.block.push(quote);
                let start = self.mark();
                self.quote_starts.push((start, depth as i32));
            }
            Tag::CodeBlock(kind) => {
                // a bullet waiting for text must not land inside the code, it would shift every highlight span
                if let Some(bullet) = self.pending_bullet.take() {
                    self.write(&bullet, false, &[]);
                }
                self.end_line();
                let language = match &kind {
                    CodeBlockKind::Fenced(language) => language_token(language).to_string(),
                    CodeBlockKind::Indented => String::new(),
                };
                // the header is a widget on a line of its own, above the code
                let header = self.mark();
                let mut end = self.buffer.end_iter();
                let anchor = self.buffer.create_child_anchor(&mut end);
                let end = self.buffer.end_iter();
                let mut before = end;
                before.backward_char();
                self.buffer.apply_tag(&self.code_head, &before, &end);
                self.write("\n", false, &[&self.code_head.clone()]);
                self.code_open = Some((header, anchor, language));
                self.block.push(self.code_block.clone());
                let mark = self.mark();
                self.code_marks.insert(self.code_sequence, mark);
                self.code_sequence += 1;
            }
            Tag::List(first) => {
                // a nested list starts in the middle of its parent item's line
                self.pending_bullet = None;
                self.end_line();
                self.lists.push(first);
            }
            Tag::Item => {
                let depth = self.lists.len().saturating_sub(1);
                let item = self.item_tag(depth);
                self.block.push(item);
                let bullet = match self.lists.last_mut() {
                    Some(Some(number)) => {
                        let text = format!("{number}. ");
                        *number += 1;
                        text
                    }
                    _ => "\u{2022} ".into(),
                };
                self.pending_bullet = Some(bullet);
            }
            Tag::Emphasis => {
                self.cell_push("<i>");
                self.inline.push(self.italic.clone());
            }
            Tag::Strong => {
                self.cell_push("<b>");
                self.inline.push(self.bold.clone());
            }
            Tag::Strikethrough => {
                self.cell_push("<s>");
                self.inline.push(self.strike.clone());
            }
            Tag::Link { dest_url, .. } => {
                if !self.cell_push(&format!(
                    "<a href=\"{}\">",
                    gtk::glib::markup_escape_text(&dest_url)
                )) {
                    let mark = self.mark();
                    self.link_starts.push((mark, dest_url.to_string()));
                }
                self.inline.push(self.link.clone());
            }
            Tag::Image { dest_url, .. } => {
                // images in table cells are shown as their alt text
                if self.table.as_ref().is_none_or(|table| table.cell.is_none()) {
                    let mark = self.mark();
                    self.image_starts.push((mark, dest_url.to_string()));
                }
                self.insert("[");
                self.inline.push(self.muted.clone());
            }
            Tag::FootnoteDefinition(label) => {
                self.block.push(self.muted.clone());
                self.write(&format!("{label} "), false, &[]);
            }
            Tag::Table(aligns) => {
                self.table = Some(Table {
                    rows: Vec::new(),
                    header_rows: 0,
                    aligns,
                    cell: None,
                })
            }
            Tag::TableHead => {
                if let Some(table) = self.table.as_mut() {
                    table.rows.push(Vec::new());
                    table.header_rows = 1;
                }
            }
            Tag::TableRow => {
                if let Some(table) = self.table.as_mut() {
                    table.rows.push(Vec::new());
                }
            }
            Tag::TableCell => {
                if let Some(table) = self.table.as_mut() {
                    table.cell = Some(String::new());
                }
            }
            _ => {}
        }
    }

    fn end(&mut self, tag: TagEnd) {
        match tag {
            TagEnd::Heading(_) => {
                self.end_line();
                self.block.pop();
                if let Some((level, text, mark)) = self.heading_text.take() {
                    if level <= 2 {
                        let end = self.mark();
                        self.decorations.borrow_mut().push(Decoration {
                            kind: Kind::Rule,
                            start: mark.clone(),
                            end,
                        });
                    }
                    self.headings.push(Heading { level, text, mark });
                }
            }
            TagEnd::BlockQuote(_) => {
                self.end_line();
                self.block.pop();
                if let Some((start, depth)) = self.quote_starts.pop() {
                    let end = self.mark();
                    self.decorations.borrow_mut().push(Decoration {
                        kind: Kind::Quote(depth),
                        start,
                        end,
                    });
                    // room under the box, nested quotes already sit inside their parent's
                    if depth == 1 {
                        let gap = self.quote_gap.clone();
                        self.write("\n", false, &[&gap]);
                    }
                }
            }
            TagEnd::Paragraph | TagEnd::FootnoteDefinition => {
                self.end_line();
                self.block.pop();
            }
            TagEnd::CodeBlock => {
                self.end_line();
                self.block.pop();
                self.finish_code();
                // same room under a code block as under a table
                let gap = self.quote_gap.clone();
                self.write("\n", false, &[&gap]);
            }
            TagEnd::List(_) => {
                self.lists.pop();
                if self.lists.is_empty() {
                    self.gap();
                }
            }
            TagEnd::Item => {
                self.pending_bullet = None;
                self.end_line();
                self.block.pop();
            }
            TagEnd::Emphasis => {
                self.cell_push("</i>");
                self.inline.pop();
            }
            TagEnd::Strong => {
                self.cell_push("</b>");
                self.inline.pop();
            }
            TagEnd::Strikethrough => {
                self.cell_push("</s>");
                self.inline.pop();
            }
            TagEnd::Link => {
                self.inline.pop();
                if !self.cell_push("</a>") {
                    if let Some((start, url)) = self.link_starts.pop() {
                        let end = self.mark();
                        self.links.push((start, end, url));
                    }
                }
            }
            TagEnd::Image => {
                self.inline.pop();
                self.insert("]");
                let in_cell = self
                    .table
                    .as_ref()
                    .is_some_and(|table| table.cell.is_some());
                if in_cell {
                    return;
                }
                if let Some((start, url)) = self.image_starts.pop() {
                    let source = if is_remote(&url) {
                        Some(ImageSource::Remote(url))
                    } else {
                        self.local_image(&url).map(ImageSource::Local)
                    };
                    if let Some(source) = source {
                        let end = self.buffer.create_mark(None, &self.buffer.end_iter(), true);
                        self.images.push(PendingImage { start, end, source });
                    } else {
                        self.buffer.delete_mark(&start);
                    }
                }
            }
            TagEnd::TableCell => {
                if let Some(table) = self.table.as_mut() {
                    let cell = table.cell.take().unwrap_or_default();
                    if let Some(row) = table.rows.last_mut() {
                        row.push(cell);
                    }
                }
            }
            TagEnd::Table => self.flush_table(),
            _ => {}
        }
    }

    /// relative images, confined to the markdown file directory
    fn local_image(&self, url: &str) -> Option<PathBuf> {
        confine(&self.dir, url)
    }

    /// a table becomes an anchor in the text, the view puts a horizontally scrollable grid on it
    /// boxes the block (header included) and pads its first and last lines
    fn finish_code(&mut self) {
        let Some((header, anchor, language)) = self.code_open.take() else {
            return;
        };
        let Some(start) = self.code_marks.get(&(self.code_sequence - 1)).cloned() else {
            return;
        };
        let end = self.mark();
        let (from, to) = (
            self.buffer.iter_at_mark(&start),
            self.buffer.iter_at_mark(&end),
        );
        if from.offset() < to.offset() {
            let mut first_end = from;
            first_end.forward_to_line_end();
            first_end.forward_char();
            self.buffer.apply_tag(&self.code_first, &from, &first_end);
            let mut last = to;
            last.backward_char();
            last.set_line_offset(0);
            self.buffer.apply_tag(&self.code_last, &last, &to);
        }
        let collapsed = Rc::new(Cell::new(false));
        let cut = Rc::new(RefCell::new(None));
        self.decorations.borrow_mut().push(Decoration {
            kind: Kind::Code(collapsed.clone(), cut.clone()),
            start: header,
            end: end.clone(),
        });
        let plain = vec![
            self.code_block.clone(),
            self.code_first.clone(),
            self.code_last.clone(),
            self.hidden.clone(),
        ];
        self.codes.push(PendingCode {
            anchor,
            language,
            start,
            end,
            collapsed,
            cut,
            hidden: self.hidden.clone(),
            plain,
        });
    }

    fn flush_table(&mut self) {
        let Some(table) = self.table.take() else {
            return;
        };
        self.end_line();
        let mut end = self.buffer.end_iter();
        let anchor = self.buffer.create_child_anchor(&mut end);
        self.tables.push(PendingTable {
            anchor,
            rows: table.rows,
            header_rows: table.header_rows,
            aligns: table.aligns,
        });
        self.write("\n", false, &[]);
        // same room under the table as under a blockquote
        let gap = self.quote_gap.clone();
        self.write("\n", false, &[&gap]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn language_token_keeps_the_first_word_of_the_info_string() {
        assert_eq!(language_token("rust,ignore"), "rust");
        assert_eq!(language_token("js {1}"), "js");
        assert_eq!(language_token(""), "");
    }

    #[test]
    fn confine_only_accepts_files_inside_the_directory() {
        let root = std::env::temp_dir().join(format!("md-dit-confine-{}", std::process::id()));
        let dir = root.join("docs");
        std::fs::create_dir_all(dir.join("sub")).unwrap();
        std::fs::write(dir.join("a b.png"), b"x").unwrap();
        std::fs::write(root.join("secret.png"), b"x").unwrap();
        let dir = dir.canonicalize().unwrap();
        assert!(confine(&dir, "a b.png").is_some());
        assert!(confine(&dir, "a%20b.png").is_some());
        assert!(confine(&dir, "../secret.png").is_none());
        assert!(confine(&dir, "/etc/passwd").is_none());
        assert!(confine(&dir, "https://example.com/x.png").is_none());
        assert!(confine(&dir, "data:image/png;base64,AA").is_none());
        assert!(confine(&dir, "missing.png").is_none());
        assert!(confine(&dir, "sub").is_none());
        std::fs::remove_dir_all(&root).unwrap();
    }
}
