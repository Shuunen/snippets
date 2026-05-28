#!/usr/bin/env bash
# Claude Code status line: model name, session usage, context % with progress bar

input=$(cat)
echo "$input" > /tmp/statusline-last-input.json

model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')

# Rate limits (Claude.ai subscription)
five_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')

# Session duration (from cost data, in ms)
duration_ms=$(echo "$input" | jq -r '.cost.total_duration_ms // empty')

# Context window usage
ctx_used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Build progress bar (10 chars wide)
make_bar() {
  local pct="$1"
  local width=10
  local filled=$(echo "$pct $width" | awk '{printf "%d", ($1/100)*$2 + 0.5}')
  local empty=$((width - filled))
  local bar=""
  for i in $(seq 1 $filled); do bar="${bar}█"; done
  for i in $(seq 1 $empty); do bar="${bar}░"; done
  echo "$bar"
}

# Format duration from milliseconds to readable
format_duration() {
  local ms="$1"
  local total_secs=$((ms / 1000))
  local hrs=$((total_secs / 3600))
  local mins=$(((total_secs % 3600) / 60))
  local secs=$((total_secs % 60))
  if [ "$hrs" -gt 0 ]; then
    printf "%dh %02dm" "$hrs" "$mins"
  elif [ "$mins" -gt 0 ]; then
    printf "%dm %02ds" "$mins" "$secs"
  else
    printf "%ds" "$secs"
  fi
}

# Assemble output
parts=()

# Model
parts+=("$model")

# Session usage: prefer rate limit % if available, else session duration
if [ -n "$five_pct" ] && [ "$five_pct" != "null" ]; then
  bar=$(make_bar "$five_pct")
  pct_int=$(printf '%.0f' "$five_pct")
  parts+=("session $bar ${pct_int}%")
elif [ -n "$duration_ms" ] && [ "$duration_ms" != "null" ]; then
  duration_str=$(format_duration "$duration_ms")
  parts+=("session ${duration_str}")
fi

# Context window
if [ -n "$ctx_used" ] && [ "$ctx_used" != "null" ]; then
  bar=$(make_bar "$ctx_used")
  pct_int=$(printf '%.0f' "$ctx_used")
  parts+=("ctx $bar ${pct_int}%")
fi

# Join with separator
result=""
for part in "${parts[@]}"; do
  if [ -z "$result" ]; then
    result="$part"
  else
    result="$result  ·  $part"
  fi
done

printf "%s\n\n" "$result"
