#!/bin/bash

# Same principle as shrink-all-pdf.sh / shrink-pdf.sh, applied to images.
#
# Looks into the current folder for compatible images, backs them up,
# then re-compresses each one to JPEG quality 85 in place.
#
# Usage: compress-all-images.sh
#
# Requires: ImageMagick (`convert`)

quality=85
backup_dir="backup"

human_size() {
  local bytes=$1
  if [ "$bytes" -ge 1048576 ]; then
    awk "BEGIN { printf \"%.2f MB\", $bytes / 1048576 }"
  else
    awk "BEGIN { printf \"%.1f KB\", $bytes / 1024 }"
  fi
}

if ! command -v convert &>/dev/null; then
  echo " ImageMagick 'convert' not found. Install it first (e.g. apt install imagemagick)."
  exit 1
fi

shopt -s nullglob nocaseglob
images=(*.jpg *.jpeg *.png *.bmp *.tiff *.tif *.webp)
shopt -u nocaseglob

if [ ${#images[@]} -eq 0 ]; then
  echo " No compatible images found in the current folder."
  exit 0
fi

mkdir -p "$backup_dir"

total_before=0
total_after=0
count=0

echo " Compressing ${#images[@]} image(s) to JPEG q$quality ..."
echo ""

for img in "${images[@]}"; do
  [ -f "$img" ] || continue

  cp -p "$img" "$backup_dir/$img"

  size_before=$(wc -c <"$img")

  base="${img%.*}"
  target="$base.jpg"

  tmp="$img.tmp.jpg"
  convert "$img" -quality "$quality" -sampling-factor 4:2:0 -strip "$tmp"
  size_after=$(wc -c <"$tmp")

  if [ "$size_after" -lt "$size_before" ]; then
    # if the source wasn't a .jpg/.jpeg, drop the original and keep only the .jpg
    if [ "$img" != "$target" ]; then
      rm -f "$img"
    fi
    mv "$tmp" "$target"
    percent=$((size_after * 100 / size_before))
    printf " %-40s %10s -> %10s (%d%%)\n" "$img" "$(human_size "$size_before")" "$(human_size "$size_after")" "$percent"
  else
    # compression didn't help, keep the original untouched
    rm -f "$tmp"
    size_after=$size_before
    printf " %-40s %10s -> %10s (kept original, already smaller)\n" "$img" "$(human_size "$size_before")" "$(human_size "$size_after")"
  fi

  total_before=$((total_before + size_before))
  total_after=$((total_after + size_after))
  count=$((count + 1))
done

echo ""
echo " ---------------------------------------------"

if [ "$total_before" -gt 0 ]; then
  saved=$((total_before - total_after))
  percent_total=$((total_after * 100 / total_before))

  echo " $count image(s) processed."
  echo " Before : $(human_size "$total_before")"
  echo " After  : $(human_size "$total_after")"
  echo " Saved  : $(human_size "$saved") (${percent_total}% of original size remains)"
fi
