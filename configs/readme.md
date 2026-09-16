# Configs

This folder is a backup of software configurations I use

## Sync

```bash
./bin/sync.js
./bin/sync.js --setup # tell sync to create files if they does not exists
./bin/sync.js --dry   # show what sync want to do without modifying anything on the fs
```

## Fresh machine

Sync only restores files. What it cannot restore are the `rtk` and `headroom`
binaries, the `ponytail` plugin, and the Headroom _deployment_ that the hooks in
`claude-settings.json` depend on. Run this once, after the sync and **before**
launching Claude Code:

```bash
bash configs/bin/setup-token-savers.sh
```

This matters because `claude-settings.json` sets
`ANTHROPIC_BASE_URL=http://127.0.0.1:8787`. If Headroom is not installed and
deployed, nothing listens on that port and every Claude Code API call fails. The
`headroom init hook ensure` hooks exit 0 silently when the deployment is missing,
so there is no error message to follow — hence the script.

The three tools cut tokens at different points: rtk filters bash output before it
reaches the model, Headroom compresses the API payload itself, and Ponytail keeps the
model from over-building in the first place. Only the first two keep a ledger —
Ponytail saves in output that was never generated, so there is no baseline to measure
against and `token-saved` leaves its savings columns empty rather than inventing them.

Once running, `token-saved` (an alias in `.bash_aliases`) shows the combined stats,
plus whether the proxy is actually live — a healthy savings ledger next to a dead
proxy means Headroom has silently stopped saving anything.

Three traps worth remembering:

- `cargo install rtk` installs an unrelated crate of the same name. Use the
  official install script (the setup script does).
- Do **not** add a hand-written `headroom-autostart.sh` SessionStart hook. It
  relies on `$CLAUDE_ENV_FILE`, which Claude Code never sets, so it silently
  routes nothing — and it races the real deployment for port 8787. Let
  `headroom init claude -g` own the wiring.
- Ponytail needs its marketplace registered before the install resolves, so it is two
  separate commands, never one.
