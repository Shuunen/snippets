# Configs

This folder is a backup of software configurations I use

## Sync

```bash
pnpm cs                # sync, then interactively merge any file that's out of sync (default)
pnpm cs --report       # just print the list of out-of-sync files, don't open the merge UI
pnpm cs --setup        # tell sync to create files if they does not exists
pnpm cs --dry          # show what sync wants to do without modifying anything on the fs
```

### Interactive merge

When a file exists on both sides but differs, `pnpm cs` opens a terminal merge UI: the
backup and live files are each shown in their own bordered box, titled with their own path
(à la Meld), side by side with a gap between them, with syntax highlighting and surrounding
file context (as much as fits the terminal, live-adjusted on resize). The currently selected
block is washed with a subtle blue background on both sides, and each of its rows gets its own
gutter bar and gap arrow, colored by what happens to that row rather than by what the block is
as a whole: green where a line is gained, red where one is lost, yellow where one is swapped for
another. So a change that replaces two lines with one shows a yellow row followed by a red one.
Before a side is chosen, rows are judged against the backup, reporting what the live file did to
them; once a side is chosen, they are judged against what the overwritten side is about to
become, reporting what confirming would do. The box that's about to
be overwritten previews the incoming content and its title gets a `(modified)` marker,
highlighted blue, as soon as a side is chosen. Any line that choice would drop stays on screen,
struck through in red instead of silently vanishing — whether the chosen side wipes the other
out entirely or merely shrinks it (say two lines replaced by one):

- `←` move the current block to the left box (the live file wins, overwriting the backup's) —
  recorded immediately, it sticks even if you navigate away without pressing Enter
- `→` move the current block to the right box (the backup wins, overwriting the live file's) —
  same, recorded immediately
- `Enter` jump to the next unresolved block (or finish, once every block has a choice)
- `↑`/`↓` freely move between conflicting blocks, to review or revisit and change an earlier
  choice before finishing
- `e` give up on the block-by-block UI and open the whole file pair in an external merge
  tool instead (auto-detected: meld, kdiff3, diffuse, bcompare or araxis merge — whichever
  is installed)
- `w` toggle line wrapping on/off (off is the default, truncating each line to one row with
  `…`); stays as you left it for the rest of the `pnpm cs` run
- `s` skip this file for now, move to the next one
- `a`/`q` abort the whole merge run

Once every block is resolved, the merged result is written to **both** the backup file
(`configs/files/...`) and the live file. As always, nothing is committed or pushed for
you — review the changes in this repo and commit/push manually.

## Code layout

The two sides of every comparison are called **repo** (the backup in `configs/files/...`, drawn on
the left) and **local** (the live file on this machine, drawn on the right). Anything held once per
side is keyed by that name rather than duplicated, so `block.text[side]` and `widths[side]` replace
a pile of `dest`/`source` pairs.

```
configs/bin/
  sync.cli.ts     entry point : flags, orchestration, final report
  core/
    types.ts        Side, SyncFile, Config, NoiseFilters, Report
    logger.ts       the one Logger instance every module writes through
  merge/          everything the interactive merge does
    blocks.ts       two file contents -> common + conflicting blocks, and back again
    noise.ts        which lines are ignorable, and how they group into runs
    context.ts      the unchanged lines shown around a conflict
    char-diff.ts    which exact characters differ, for the brighter wash
    navigation.ts   block cursor state machine + keypress mapping
    options.ts      glyphs, colors, layout numbers, hints
    text.ts         ansi-aware wrapping, truncating, highlighting, padding
    render.ts       buildPanel() : the whole frame as string[]
    hints.ts        the footer keybinding rows
    status.ts       the per-pane status footer
    screen.ts       draws a frame in one write, erases exactly what it drew
    keypress.ts     raw stdin, keypress/resize race
    session.ts      per-file merge loop, retries, external tool hand-off
  sync/           reading configs off disk and reporting on them
    catalog.ts      the list of files to back up, per platform
    files.ts        reads both sides, works out what is already in sync
    paths.ts        path helpers and copying
    report.ts       the report buckets and the closing message
```

Rendering is pure : `buildPanel()` returns the frame as an array of strings and `screen.draw()`
writes it in one go, so the whole panel is unit-testable and can never appear half-drawn. Every
module above is covered by tests except the five that genuinely touch stdin, stdout, or the
filesystem (`screen`, `keypress`, `session`, `files`, `sync.cli`).
