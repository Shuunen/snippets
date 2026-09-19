# TODO

Ideas for the `configs` sync/merge tool, inspired by Meld, not built yet.

- **Per-pane status footer** — encoding / filetype / line count under each pane, echoing Meld's bottom
  status bar. Cosmetic, cheap, low priority.

The output is weird :

```bash
> @shuunen/snippets@0.2.0 cs /home/rominou/Projects/github/snippets
> bun config:sync

$ bun configs/bin/sync.cli.ts
   init  info Using home directory : /home/rominou
   +0ms  info Using app data directory : /home/rominou/.config
   +0ms  info Detected platform : Linux, process.platform is "linux"

Syncing....................................  +50ms  info ✓ /home/rominou/Projects/github/snippets/configs/files/qBittorrent.conf is now in sync
   +0ms  info

Merge session done, review the changes in this repo, then commit & push manually :)
```

Do the /ship skill
