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
block is washed with a subtle blue background on both sides, and its gutter is colored by
what kind of change it is: green when a line was added on the live side, red when a line was
removed from it, yellow when a line exists on both sides but changed. The box that's about to
be overwritten previews the incoming content and its title gets a `(modified)` marker,
highlighted blue, as soon as a side is chosen:

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

See `configs/TODO.md` for further Meld-inspired ideas not built yet.
