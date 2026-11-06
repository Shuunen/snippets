//! librsvg, the engine behind GTK's svg loader, ignores `<foreignObject>`, the way many generators put html text in a banner.
//! Each one holding plain text is rewritten into a native `<text>` so the words show up.

/// the svg with every `<foreignObject>` replaced by an equivalent `<text>`, none when it has no such element
pub fn inline_foreign_objects(svg: &str) -> Option<String> {
    const OPEN: &str = "<foreignObject";
    const CLOSE: &str = "</foreignObject>";
    svg.find(OPEN)?;
    let canvas = canvas_width(svg);
    let mut out = String::with_capacity(svg.len());
    let mut rest = svg;
    while let Some(start) = rest.find(OPEN) {
        out.push_str(&rest[..start]);
        let after = &rest[start..];
        let Some(tag_end) = tag_end(after) else {
            out.push_str(after);
            return Some(out);
        };
        let tag = &after[..=tag_end];
        let (inner, consumed) = if tag.ends_with("/>") {
            ("", tag_end + 1)
        } else if let Some(offset) = after[tag_end + 1..].find(CLOSE) {
            let close = tag_end + 1 + offset;
            (&after[tag_end + 1..close], close + CLOSE.len())
        } else {
            out.push_str(after);
            return Some(out);
        };
        out.push_str(&text_element(tag, inner, canvas));
        rest = &after[consumed..];
    }
    out.push_str(rest);
    Some(out)
}

/// the index of the `>` closing the tag at the start of `text`, skipping any inside a quoted value
fn tag_end(text: &str) -> Option<usize> {
    let mut quote = None;
    for (index, char) in text.char_indices() {
        match (quote, char) {
            (None, '"' | '\'') => quote = Some(char),
            (Some(open), _) if open == char => quote = None,
            (None, '>') => return Some(index),
            _ => {}
        }
    }
    None
}

/// the value of an attribute of a tag, `x` never matches `data-x`
fn attribute<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let mut from = 0;
    while let Some(found) = tag[from..].find(name) {
        let at = from + found;
        from = at + name.len();
        let before_ok = tag[..at].ends_with(|char: char| char.is_whitespace());
        let Some(value) = tag[from..].trim_start().strip_prefix('=') else {
            continue;
        };
        let value = value.trim_start();
        let quote = value
            .chars()
            .next()
            .filter(|char| matches!(char, '"' | '\''));
        if let (true, Some(quote)) = (before_ok, quote) {
            let value = &value[1..];
            return value.find(quote).map(|end| &value[..end]);
        }
    }
    None
}

/// the value of a css declaration of a `style` attribute
fn declaration(style: &str, property: &str) -> Option<String> {
    style.split(';').find_map(|part| {
        let (name, value) = part.split_once(':')?;
        (name.trim().eq_ignore_ascii_case(property)).then(|| value.trim().to_string())
    })
}

fn canvas_width(svg: &str) -> f64 {
    let root = svg
        .find("<svg")
        .and_then(|start| tag_end(&svg[start..]).map(|end| &svg[start..=end]))
        .unwrap_or("");
    attribute(root, "viewBox")
        .and_then(|view| {
            view.split([' ', ','])
                .filter(|part| !part.is_empty())
                .nth(2)
        })
        .and_then(|width| width.parse().ok())
        .or_else(|| {
            attribute(root, "width").and_then(|width| width.trim_end_matches("px").parse().ok())
        })
        .unwrap_or(100.0)
}

/// a length such as `12`, `12px` or `50%`
fn length(value: Option<&str>, canvas: f64) -> f64 {
    let Some(value) = value.map(str::trim) else {
        return 0.0;
    };
    match value.strip_suffix('%') {
        Some(percent) => percent
            .parse::<f64>()
            .map_or(0.0, |percent| percent * canvas / 100.0),
        None => value.trim_end_matches("px").parse().unwrap_or(0.0),
    }
}

fn is_bold(style: &str) -> bool {
    declaration(style, "font-weight").is_some_and(|weight| {
        weight == "bold" || weight.parse::<u32>().is_ok_and(|weight| weight >= 600)
    })
}

/// the text of the html inside a foreign object, each bold run in its own `<tspan>`
fn runs(inner: &str) -> String {
    let mut out = String::new();
    let mut bold: Vec<bool> = Vec::new();
    let mut rest = inner;
    while !rest.is_empty() {
        let Some(open) = rest.find('<') else {
            push_run(&mut out, rest, bold.last().copied().unwrap_or(false));
            break;
        };
        push_run(
            &mut out,
            &rest[..open],
            bold.last().copied().unwrap_or(false),
        );
        rest = &rest[open..];
        let Some(end) = tag_end(rest) else { break };
        let tag = &rest[..=end];
        if tag.starts_with("</") {
            bold.pop();
        } else if !tag.ends_with("/>") && !tag.starts_with("<!") {
            let inherited = bold.last().copied().unwrap_or(false);
            bold.push(inherited || attribute(tag, "style").is_some_and(is_bold));
        }
        rest = &rest[end + 1..];
    }
    out
}

fn push_run(out: &mut String, text: &str, bold: bool) {
    // the whitespace between two elements is only indentation
    if text.is_empty() || (text.trim().is_empty() && text.contains('\n')) {
        return;
    }
    let text = text.replace(['\n', '\r'], " ");
    if bold {
        out.push_str(&format!("<tspan font-weight=\"700\">{text}</tspan>"));
    } else {
        out.push_str(&text);
    }
}

fn text_element(tag: &str, inner: &str, canvas: f64) -> String {
    let style = attribute(tag, "style").unwrap_or("");
    let size = declaration(style, "font-size")
        .and_then(|size| size.trim_end_matches("px").parse::<f64>().ok())
        .unwrap_or(16.0);
    let (x, width) = (
        length(attribute(tag, "x"), canvas),
        length(attribute(tag, "width"), canvas),
    );
    // the baseline of the first line of text, the ascent of a typical sans-serif font below the top of the box
    let y = length(attribute(tag, "y"), canvas) + 0.88 * size;
    let (x, anchor) = match declaration(style, "text-align").as_deref() {
        Some("center") => (x + width / 2.0, "middle"),
        Some("right" | "end") => (x + width, "end"),
        _ => (x, "start"),
    };
    let family = declaration(style, "font-family").unwrap_or_else(|| "sans-serif".into());
    let color = declaration(style, "color").unwrap_or_else(|| "black".into());
    let spacing = declaration(style, "letter-spacing")
        .map(|spacing| format!(" letter-spacing=\"{}\"", spacing.trim_end_matches("px")))
        .unwrap_or_default();
    let weight = if is_bold(style) {
        " font-weight=\"700\""
    } else {
        ""
    };
    format!(
        "<text x=\"{x}\" y=\"{y}\" text-anchor=\"{anchor}\" font-size=\"{size}\" font-family=\"{family}\" fill=\"{color}\"{spacing}{weight} xml:space=\"preserve\">{}</text>",
        runs(inner)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leaves_a_plain_svg_alone() {
        assert!(inline_foreign_objects("<svg viewBox=\"0 0 10 10\"><path/></svg>").is_none());
    }

    #[test]
    fn survives_a_closing_tag_hidden_in_an_attribute() {
        let svg = "<svg viewBox=\"0 0 10 10\"><foreignObject a=\"</foreignObject>\" width=\"10\">x</foreignObject></svg>";
        assert!(inline_foreign_objects(svg).is_some());
        assert!(
            inline_foreign_objects("<svg><foreignObject a=\"</foreignObject>\"></svg>").is_some()
        );
    }

    #[test]
    fn rewrites_centered_html_text() {
        let svg = "<svg viewBox=\"0 0 388 240\"><foreignObject x=\"0\" y=\"150\" width=\"100%\" height=\"30\" style=\"font-size: 28px; color: white; text-align: center; font-family: Arial;\">\n<xhtml:div>Shuunen</xhtml:div>\n<xhtml:div style=\"font-weight: 700;\">snippets</xhtml:div>\n</foreignObject></svg>";
        let out = inline_foreign_objects(svg).unwrap();
        assert!(!out.contains("foreignObject"));
        assert!(out.contains("x=\"194\""));
        assert!(out.contains("text-anchor=\"middle\""));
        assert!(out.contains("fill=\"white\""));
        assert!(out.contains("Shuunen<tspan font-weight=\"700\">snippets</tspan>"));
    }
}
