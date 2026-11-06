# md-dit

Instant markdown viewer for Linux, native GTK4 and no webview. Rust parses the markdown with `pulldown-cmark` and fills a `GtkTextView` with formatted text, the first screen goes in before the window is shown and the rest streams in on idle callbacks.

Needs `libgtk-4-dev` and `libadwaita-1-dev` to build. The binary, the application id and the installed files are all named `md-dit-gtk`.

```sh
cargo build --release
target/release/md-dit-gtk file.md
```

## Table of contents

- [What it does](#what-it-does)
- [Why it is fast](#why-it-is-fast)
- [Benchmark](#benchmark)
- [Alternatives](#alternatives)
- [Icon](#icon)
- [Command line options](#command-line-options)

## What it does

Headings, bold, italic, strikethrough, inline code, links (click opens `http`, `https` and `mailto` ones only, any other scheme such as `file:` or `ssh:` is ignored since a document is untrusted), nested and ordered lists, task lists, blockquotes, fenced code blocks, tables, footnotes. Raw HTML can not be rendered by a `GtkTextView` and is skipped.

- syntax highlighting with syntect, light and dark following the system, computed on a background thread started after the first frame and applied a few blocks at a time
- tables as a grid with a header band, zebra rows, per-column alignment (`:---`, `:---:`, `---:`), wrapped cells that keep bold, italic, code and links, scrolling sideways inside the reading column when wider than it, without blocking the page scroll
- blockquotes as a tinted box with a left border, rules under H1 and H2
- table of contents sidebar built from the headings, always either expanded or collapsed to a thin rail (never gone) : it expands by itself when the window has room around the reading column and collapses back when it does not, until you click the triangle (or press `t`), your choice is then kept whatever the window size. The handle between the sidebar and the document resizes it, never wider than its longest displayed heading nor narrower than 160 px. Click a heading to jump, the current one is highlighted, headings with children fold. Documents with fewer than 3 headings have no sidebar.
- live reload when the file changes, scroll position kept, an unreadable file (mid-save, for instance) is retried on the next poll
- relative images and `http(s)` images (fetched in the background, 10 s timeout, 10 MB max) shown inline once the first frame is out, `[alt]` when the file is missing or the download fails
- a centred 860 px reading column, the first screen is painted before the rest of the document streams in

```sh
./install.sh              # ~/.local/bin + icon + .desktop entry
./install.sh --default    # same, and makes it the default markdown app
```

## Why it is fast

- The software renderer (`GSK_RENDERER=cairo`) is selected at start-up unless set. GTK's default GPU renderer costs about 125 ms to initialise its GL context here (175 ms against 300 ms for an empty document), and a text viewer does not need it. Set `GSK_RENDERER` yourself to override.
- `GtkTextView` lays out lazily, so only the first screen is measured before the first frame.
- Only the first ~4 KB of markdown is inserted before the window is shown, syntax highlighting, images, tables and the table of contents wait for the first frame.

## Benchmark

```sh
bench/make-fixture.sh /tmp/big.md 200
hyperfine -w 3 "target/release/md-dit-gtk --exit-after-head /tmp/big.md"
```

`--exit-after-head` quits once the first frame is painted, `--exit-after-full` once the whole document is in the buffer, coloured and painted. On the 200 KB fixture : first paint ~230 ms (native Wayland), ~320 ms under X11 with `bench/time-to-readable.py`, fully loaded and coloured ~850 ms. These numbers were measured before the sidebar, table and blockquote work, they have not been re-measured since.

## Alternatives

Inspiration : [Tinta](https://github.com/oipoistar/tinta) is the Windows-only viewer (C++, Direct2D, no web engine, under 100 ms start-up) that started this project. A first Tauri 2 version (WebKitGTK, about 480 ms) was written and then dropped, the native GTK4 version below is about twice as fast.

| Project                                                               | Stack                                 | Notes                                                                                                                                                                                          | Bench                                                                           |
| --------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| md-dit (this project)                                                 | GTK4, Rust, no webview                | native, same features as the prototype below (syntax highlighting, table of contents, live reload, images) except raw HTML                                                                     | ~230 ms (~320 ms under X11), before the table and sidebar work, not re-measured |
| md-dit Tauri prototype (dropped)                                      | Tauri 2, Rust, WebKitGTK              | the first version of this project, replaced by the GTK one                                                                                                                                     | ~480 ms (~1.0 s under XWayland)                                                 |
| [aydiler/md-viewer](https://github.com/aydiler/md-viewer)             | Rust, egui, no webview                | tabs, file explorer, outline, live reload, native Mermaid and LaTeX math. Install script, snap, AUR, cargo (Flatpak not published yet). The one to beat for raw start-up since it skips WebKit | ~380 ms under X11 (v0.3.0, no webview)                                          |
| [GRVYDEV/marky](https://github.com/GRVYDEV/marky)                     | Tauri 2, React, Vite, markdown-it     | macOS and Linux only. Opens files or folders from the terminal, live reload, command palette, Mermaid, KaTeX. `.deb` and AppImage                                                              | none                                                                            |
| [akaneghro/md-viewer](https://github.com/akaneghro/md-viewer)         | Tauri 2, Nuxt 4 (Vue 3)               | viewer and editor with live preview, GitHub style, table of contents, dark mode. AppImage, `.deb`, `.rpm`                                                                                      | none                                                                            |
| [webcmslu/marka](https://github.com/webcmslu/marka)                   | Tauri 2, React 19, Vite, marked       | viewer and editor with live preview, file browser, table of contents, search. `.deb`, `.rpm`, AppImage                                                                                         | none                                                                            |
| [createchance/mdviewer](https://github.com/createchance/mdviewer)     | Tauri 2, React 19, Vite, Rust backend | react-markdown, KaTeX, Mermaid, highlight.js. Linux amd64 `.deb` and AppImage                                                                                                                  | ~2.0 s under XWayland (table of contents and file list settle at ~2.8 s)        |
| [gnome-text-editor](https://gitlab.gnome.org/GNOME/gnome-text-editor) | GTK4                                  | plain text editor, no markdown rendering                                                                                                                                                       | ~420 ms under XWayland (source only, not rendered)                              |
| [Apostrophe](https://gitlab.gnome.org/World/apostrophe) (Flatpak)     | GTK4                                  | markdown editor with live preview                                                                                                                                                              | ~3.2 s under XWayland                                                           |

More in [awesome-markdown-editors](https://github.com/mundimark/awesome-markdown-editors).

Bench is the time until the markdown is readable with the bare minimum (theme and formatting), even if other features are still lazy loading, measured on a 200 KB file with all the typical markdown features (`bench/make-fixture.sh`). For md-dit it is `--exit-after-head`, the first screen painted while the rest of the document streams in. `none` means not benchmarked yet, the notes for those projects come from their repo pages.

Other apps can only be timed from outside through `bench/time-to-readable.py`, which polls captures of the app window and reports when the text density of the central document column reaches 80% of its final value (side panels such as a table of contents or a file list are ignored, a second "settled" time says when the whole picture stops changing). GNOME on Wayland gives no way to capture other apps, so it runs them under XWayland, which costs WebKit about 500 ms : compare an app measured that way with the md-dit numbers measured the same way (~320 ms for the GTK version, ~1.0 s for the Tauri prototype), not with the native ones. On the Tauri prototype the script and its internal signal agreed (973 ms against 970 ms). Resolution is ~100 ms. Runs : 6 for aydiler/md-viewer (v0.3.0 from `cargo install md-viewer`, forced to X11 with `env -u WAYLAND_DISPLAY WINIT_UNIX_BACKEND=x11`), 5 for GNOME Text Editor and mdviewer, 4 for Apostrophe, no instance already running. GNOME Text Editor shows the markdown source highlighted, it does not render it. Apostrophe was run in its saved full-width preview mode on a copy of the fixture without the raw HTML line, which otherwise triggers its "this file may be insecure" prompt, its Flatpak start-up is part of the time and a cold first run took 4.1 s.

## Icon

`icons/icon.svg` is the source. `icons/icon.png` (256x256, embedded in the window) must be rendered with a real SVG engine, ImageMagick mangles the gradients :

```sh
echo '<style>html,body{margin:0}img{display:block;width:256px;height:256px}</style><img src="file://'$PWD'/icons/icon.svg">' > /tmp/icon.html
google-chrome --headless=new --no-sandbox --default-background-color=00000000 --window-size=256,256 --screenshot=icons/icon.png file:///tmp/icon.html
```

The dock renders the installed SVG with librsvg, which ignores CSS `transform-origin`. Some SVG editors export zooms as `style="transform-origin: …" transform="matrix(…)"`, fold the origin into the matrix before installing or the logo lands in a corner.

## Command line options

| Option              | Effect                                                    |
| ------------------- | --------------------------------------------------------- |
| `file.md`           | markdown file to open                                     |
| `--exit-after-head` | quit once the first frame is painted                      |
| `--exit-after-full` | quit once the whole document is loaded, coloured, painted |
