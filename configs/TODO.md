# TODO

Ideas for the `configs` sync/merge tool, inspired by Meld, not built yet.

- **Per-pane status footer** — encoding / filetype / line count under each pane, echoing Meld's bottom
  status bar. Cosmetic, cheap, low priority.
- **Interactive text filters** — toggle the `removeLinesMatching` / `removeLinesAfter` noise-filtering
  rules (used for `qBittorrent.conf`, `Greenshot.ini`, `launchy.ini`) on/off live from the merge UI,
  instead of them being fixed in `configs/bin/files.node.ts`. Touches the comparison pipeline, not just
  the merge screen — bigger scope.
