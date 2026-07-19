#!/bin/sh

if ! command -v ffprobe >/dev/null 2>&1; then
  zenity --error --text "Ffprobe is not installed" --width 300
  exit 1
fi

if [ -n "$2" ]; then
  time="$2"
else
  time=$(zenity --entry --title="Take screenshot" --text="Please type the time in mmss or ss :" --entry-text="")
fi

bun ~/Projects/github/snippets/src/take-screenshot.cli.js "$1" "$time"

if command -v notify-send >/dev/null 2>&1; then
  notify-send "Screenshot taken" "Screenshot saved to your image folder"
else
  zenity --notification --text "Screenshot taken to your image folder"
fi
