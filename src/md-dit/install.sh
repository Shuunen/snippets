#!/usr/bin/env bash
# usage: install.sh [--default] — builds md-dit-gtk and installs it for the current user, --default also makes it the default markdown app
set -euo pipefail
cd "$(dirname "$0")"
step() { printf '\n==> %s\n' "$*"; }
step "building release binary (the last step links everything and can take ~10-40s, no output until it ends)"
cargo build --release
step "installing files into ~/.local"
install -Dm755 target/release/md-dit-gtk "$HOME/.local/bin/md-dit-gtk"
install -Dm644 icons/icon.svg "$HOME/.local/share/icons/hicolor/scalable/apps/md-dit-gtk.svg"
install -Dm644 icons/icon.png "$HOME/.local/share/icons/hicolor/256x256/apps/md-dit-gtk.png"
# the desktop file name has to match the application id for the dock to find the icon
install -Dm644 com.shuunen.md-dit-gtk.desktop "$HOME/.local/share/applications/com.shuunen.md-dit-gtk.desktop"
step "refreshing icon and desktop caches (without it the dock shows a generic icon)"
gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || echo "gtk-update-icon-cache not found, the icon may need a re-login to show"
touch "$HOME/.local/share/icons/hicolor" "$HOME/.local/share/applications" "$HOME/.local/share/applications/com.shuunen.md-dit-gtk.desktop"
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
# GNOME Shell only notices a changed icon when the touch comes after the caches were rebuilt
sleep 2
touch "$HOME/.local/share/icons/hicolor" "$HOME/.local/share/applications" "$HOME/.local/share/applications/com.shuunen.md-dit-gtk.desktop"
if [ "${1:-}" = "--default" ]; then
  step "setting md-dit-gtk as the default markdown app"
  xdg-mime default com.shuunen.md-dit-gtk.desktop text/markdown text/x-markdown
  echo "default for text/markdown: $(xdg-mime query default text/markdown)"
fi
printf '\nmd-dit-gtk installed to ~/.local/bin/md-dit-gtk\n'
