#!/bin/sh
# Thunar custom action: copy the path(s) of the selected file(s) to the clipboard
printf '%s\n' "$@" | head -c -1 | wl-copy
