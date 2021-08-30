#!/bin/bash

time=$(zenity --entry --title="Take screenshot" --text="Please type the time in mmss or ss :" --entry-text="")

node "$HOME/Projects/github/snippets/one-file/take-screenshot.js" "$1" "$time"
