# Configs

This folder is a backup of software configurations I use

## Sync

```bash
./bin/sync.js
./bin/sync.js --setup # tell sync to create files if they does not exists
./bin/sync.js --dry   # show what sync want to do without modifying anything on the fs
```

## Fresh machine

Sync only restores files. Two things it cannot restore are the `rtk` and `headroom`
binaries, and the Headroom _deployment_ that the hooks in `claude-settings.json`
depend on. Run this once, after the sync and **before** launching Claude Code:

```bash
bash configs/bin/setup-token-savers.sh
```

This matters because `claude-settings.json` sets
`ANTHROPIC_BASE_URL=http://127.0.0.1:8787`. If Headroom is not installed and
deployed, nothing listens on that port and every Claude Code API call fails. The
`headroom init hook ensure` hooks exit 0 silently when the deployment is missing,
so there is no error message to follow — hence the script.

Once running, `token-saved` (a function in `.bash_aliases`) shows the combined stats
for both tools, plus whether the proxy is actually live — a healthy savings ledger
next to a dead proxy means Headroom has silently stopped saving anything.

Two traps worth remembering:

- `cargo install rtk` installs an unrelated crate of the same name. Use the
  official install script (the setup script does).
- Do **not** add a hand-written `headroom-autostart.sh` SessionStart hook. It
  relies on `$CLAUDE_ENV_FILE`, which Claude Code never sets, so it silently
  routes nothing — and it races the real deployment for port 8787. Let
  `headroom init claude -g` own the wiring.
