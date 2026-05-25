#!/bin/bash

if ! command -v ffprobe &>/dev/null; then
  zenity --error --text "Ffprobe is not installed" --width 300
  exit 1
fi

time=$(zenity --entry --title="Take screenshot" --text="Please type the time in mmss or ss :" --entry-text="")

take-screenshot.js "$1" "$time"

zenity --notification --text "Screenshot taken to your image folder"
