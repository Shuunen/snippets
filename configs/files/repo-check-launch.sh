#!/usr/bin/env bash
# Start the repo-check dashboard server if needed, then open its installed PWA window
set -u

url='http://127.0.0.1:4747'
target="$HOME/Projects/github"
cli="$HOME/Projects/github/repo-checker/dist/cli.js"
# the id of the installed PWA, read from the launcher entry Chrome wrote, so a reinstall needs no edit here
app_id=$(grep -l '^Name=repo-checker$' "$HOME"/.local/share/applications/chrome-*-Default.desktop 2>/dev/null | head -n 1 | sed -E 's/.*chrome-([a-p]{32})-Default\.desktop/\1/')
log="$HOME/.local/state/repo-check/ui.log"

# true when the server on the port is repo-check, not some other app
is_up() { curl -sf --max-time 1 "$url/" | grep -qi 'repo-check'; }

if ! is_up; then
  # a desktop launch does not read .bashrc, so load nvm for node
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  mkdir -p "$(dirname "$log")"
  nohup node "$cli" ui --target="$target" --no-open >"$log" 2>&1 &
  for _ in $(seq 1 30); do
    is_up && break
    sleep 0.5
  done
  if ! is_up; then
    notify-send -i dialog-error 'repo-check did not start' "$(tail -n 5 "$log")"
    exit 1
  fi
fi

# point the menu entry at the installed PWA, for its icon and the dock grouping. The backup in snippets has no such lines, since the id depends on the machine
entry="$HOME/.local/share/applications/repo-check.desktop"
if [ -n "$app_id" ] && [ -f "$entry" ] && ! grep -q "^StartupWMClass=crx_$app_id$" "$entry"; then
  sed -i -E '/^(Icon|StartupWMClass)=/d' "$entry"
  printf 'Icon=%s\nStartupWMClass=crx_%s\n' "$HOME/.local/share/icons/hicolor/512x512/apps/chrome-$app_id-Default.png" "$app_id" >>"$entry"
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null
fi

if [ -z "$app_id" ]; then
  # no installed PWA: an app window on the address still works
  exec /opt/google/chrome/google-chrome --app="$url"
fi
exec /opt/google/chrome/google-chrome --profile-directory=Default --app-id="$app_id"
