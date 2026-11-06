use std::{sync::mpsc, thread};

use syntect::{
    easy::HighlightLines,
    highlighting::{FontStyle, Style, ThemeSet},
    parsing::SyntaxSet,
    util::LinesWithEndings,
};

pub struct Job {
    pub index: usize,
    pub language: String,
    pub code: String,
}

/// a coloured run of characters, relative to the start of its code block, with the colour for both themes
pub struct Span {
    pub start: i32,
    pub end: i32,
    pub light: u32,
    pub dark: u32,
    pub bold: bool,
    pub italic: bool,
}

fn rgb(style: &Style) -> u32 {
    let color = style.foreground;
    (u32::from(color.r) << 16) | (u32::from(color.g) << 8) | u32::from(color.b)
}

/// the bundled syntax set has no TypeScript, JavaScript is close enough to be useful
fn token(language: &str) -> &str {
    if matches!(language, "ts" | "tsx" | "typescript" | "jsx") {
        "js"
    } else {
        language
    }
}

/// highlights every job on a background thread so that loading the syntaxes overlaps with the window start-up
pub fn spawn(jobs: Vec<Job>) -> mpsc::Receiver<(usize, Vec<Span>)> {
    let (sender, receiver) = mpsc::channel();
    if jobs.is_empty() {
        return receiver;
    }
    thread::spawn(move || {
        let syntaxes = SyntaxSet::load_defaults_newlines();
        let themes = ThemeSet::load_defaults();
        let (light, dark) = (
            &themes.themes["InspiredGitHub"],
            &themes.themes["base16-ocean.dark"],
        );
        for job in jobs {
            let Some(syntax) = syntaxes.find_syntax_by_token(token(&job.language)) else {
                continue;
            };
            let (mut light_lines, mut dark_lines) = (
                HighlightLines::new(syntax, light),
                HighlightLines::new(syntax, dark),
            );
            let mut spans: Vec<Span> = Vec::new();
            let mut offset = 0;
            for line in LinesWithEndings::from(&job.code) {
                let (Ok(light_tokens), Ok(dark_tokens)) = (
                    light_lines.highlight_line(line, &syntaxes),
                    dark_lines.highlight_line(line, &syntaxes),
                ) else {
                    break;
                };
                for ((light_style, text), (dark_style, _)) in
                    light_tokens.iter().zip(dark_tokens.iter())
                {
                    let length = text.chars().count() as i32;
                    let span = Span {
                        start: offset,
                        end: offset + length,
                        light: rgb(light_style),
                        dark: rgb(dark_style),
                        bold: light_style.font_style.contains(FontStyle::BOLD),
                        italic: light_style.font_style.contains(FontStyle::ITALIC),
                    };
                    offset += length;
                    match spans.last_mut() {
                        Some(last)
                            if last.light == span.light
                                && last.dark == span.dark
                                && last.bold == span.bold
                                && last.italic == span.italic
                                && last.end == span.start =>
                        {
                            last.end = span.end;
                        }
                        _ => spans.push(span),
                    }
                }
            }
            if sender.send((job.index, spans)).is_err() {
                return;
            }
        }
    });
    receiver
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_maps_typescript_flavours_to_javascript() {
        for language in ["ts", "tsx", "typescript", "jsx"] {
            assert_eq!(token(language), "js");
        }
        assert_eq!(token("rust"), "rust");
    }
}
