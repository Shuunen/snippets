#!/bin/bash

# Same principle as shrink-all-pdf.sh / shrink-pdf.sh, applied to images.
#
# Looks into a folder for compatible images, backs them up, then re-compresses
# each one in place. JPEG-family files stay JPEG, PNG-family files stay PNG so
# transparency is never destroyed. Anything that cannot be compressed is still
# listed in the report with a "File not handled" status.
#
# Usage: compress-all-images.sh [folder] [options]
#
#   folder              folder to process (default: current folder)
#   -q, --quality N     target JPEG quality (default: 85)
#   -g, --gate N        minimum PSNR in dB for a lossy PNG result (default: 40)
#   -j, --jobs N        images compressed in parallel (default: CPU count)
#   -d, --dry-run       report what would happen, change nothing
#   -s, --strip-metadata  drop EXIF/ICC data (capture date, GPS, camera)
#   -n, --no-prompt     never ask about installing missing optional tools
#       --no-color      disable coloured output (also honours NO_COLOR)
#   -h, --help          show this help
#
# EXIF is preserved by default: capture dates and GPS cannot be recovered once
# dropped, and they are worth more than the handful of kilobytes they cost.
#
# Requires: ImageMagick (`magick` or `convert`, plus `identify` and `compare`)
# Optional: pngquant and jpegoptim are used automatically when installed

set -uo pipefail

quality=85
psnr_gate=40
backup_dir="backup"
folder="."
dry_run=0
keep_metadata=1
prompt_install=1
use_color=1
jobs=$(nproc 2>/dev/null || echo 4)

# Prints the comment header above, so the help can never drift from the source.
usage() {
  awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print; next } NR > 2 { exit }' "$0"
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    -q | --quality) quality="$2"; shift 2 ;;
    -g | --gate) psnr_gate="$2"; shift 2 ;;
    -j | --jobs) jobs="$2"; shift 2 ;;
    -d | --dry-run) dry_run=1; shift ;;
    -s | --strip-metadata) keep_metadata=0; shift ;;
    -n | --no-prompt) prompt_install=0; shift ;;
    --no-color) use_color=0; shift ;;
    -k | --keep-metadata) keep_metadata=1; shift ;;
    -h | --help) usage 0 ;;
    -*) echo "Unknown option: $1" >&2; usage 1 ;;
    *) folder="$1"; shift ;;
  esac
done

# --- colors ------------------------------------------------------------------

# Escapes are emitted only for a real terminal, so redirected or piped output
# stays plain text. NO_COLOR (https://no-color.org) is honoured too.
if [ "$use_color" -eq 1 ] && [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  c_reset=$'\033[0m'
  c_bold=$'\033[1m'
  c_dim=$'\033[2m'
  c_red=$'\033[31m'
  c_green=$'\033[32m'
  c_yellow=$'\033[33m'
  c_cyan=$'\033[36m'
else
  c_reset="" c_bold="" c_dim="" c_red="" c_green="" c_yellow="" c_cyan=""
fi

# Breathing room before the first line, whichever path speaks first.
echo ""

# --- tooling -----------------------------------------------------------------

# Package naming differs per distribution, so the install hint is built from
# whichever package manager is actually present.
pkg_install=""
pkg_imagemagick="imagemagick"
if command -v apt-get &>/dev/null; then
  pkg_install="sudo apt install"
elif command -v dnf &>/dev/null; then
  pkg_install="sudo dnf install"; pkg_imagemagick="ImageMagick"
elif command -v pacman &>/dev/null; then
  pkg_install="sudo pacman -S"
elif command -v zypper &>/dev/null; then
  pkg_install="sudo zypper install"; pkg_imagemagick="ImageMagick"
elif command -v apk &>/dev/null; then
  pkg_install="sudo apk add"
elif command -v brew &>/dev/null; then
  pkg_install="brew install"
fi

install_hint() {
  if [ -n "$pkg_install" ]; then
    printf '%s %s' "$pkg_install" "$*"
  else
    printf 'install with your package manager: %s' "$*"
  fi
}

# Only ever prompts on a real interactive stdin. Falling back to /dev/tty would
# hang the script inside a pipeline or a CI job, so it deliberately does not.
ask_yes_no() {
  local reply
  [ "$prompt_install" -eq 1 ] || return 1
  [ -t 0 ] || return 1
  read -r -p "$1 [y/N] " reply || return 1
  case "$reply" in
    [yY] | [yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}

# Asks whether to install the given packages. Answering yes prints the command
# and stops, so the user can install and re-run with the tools available.
offer_install() {
  local label="$1"; shift
  if ask_yes_no "Do you want to install $label?"; then
    echo ""
    echo "  Run this command, then start the script again :"
    echo ""
    printf '    %s%s%s\n' "$c_cyan" "$(install_hint "$@")" "$c_reset"
    echo ""
    exit 0
  fi
  return 1
}

if command -v magick &>/dev/null; then
  im_convert=(magick)
  im_identify=(magick identify)
  im_compare=(magick compare)
elif command -v convert &>/dev/null; then
  im_convert=(convert)
  im_identify=(identify)
  im_compare=(compare)
else
  printf '%sImageMagick is required but was not found.%s\n' "$c_red" "$c_reset"
  offer_install "ImageMagick" "$pkg_imagemagick"
  printf '%sCannot continue without ImageMagick. Install it with :%s\n' "$c_red" "$c_reset"
  printf '    %s%s%s\n' "$c_cyan" "$(install_hint "$pkg_imagemagick")" "$c_reset"
  exit 1
fi

has_pngquant=0
has_jpegoptim=0
command -v pngquant &>/dev/null && has_pngquant=1
command -v jpegoptim &>/dev/null && has_jpegoptim=1

missing_optional=()
[ "$has_pngquant" -eq 0 ] && missing_optional+=(pngquant)
[ "$has_jpegoptim" -eq 0 ] && missing_optional+=(jpegoptim)

if [ ${#missing_optional[@]} -gt 0 ]; then
  printf '%sOptional tools not installed :%s %s\n' "$c_yellow" "$c_reset" "${missing_optional[*]}"
  [ "$has_pngquant" -eq 0 ] && printf '%s  pngquant  - smaller PNGs than ImageMagick can produce%s\n' "$c_dim" "$c_reset"
  [ "$has_jpegoptim" -eq 0 ] && printf '%s  jpegoptim - shrinks already-optimized JPEGs losslessly%s\n' "$c_dim" "$c_reset"
  offer_install "them" "${missing_optional[@]}"
  printf '%sContinuing without them.%s\n' "$c_dim" "$c_reset"
  echo ""
fi

strip_args=(-strip)
pngquant_strip=(--strip)
jpegoptim_strip=(--strip-all)
if [ "$keep_metadata" -eq 1 ]; then
  strip_args=()
  pngquant_strip=()
  jpegoptim_strip=()
fi

[ -d "$folder" ] || { echo "Not a folder: $folder" >&2; exit 1; }
cd "$folder" || exit 1

# --- helpers -----------------------------------------------------------------

human_size() {
  local bytes=$1
  if [ "$bytes" -ge 1073741824 ]; then
    awk "BEGIN { printf \"%.2f GB\", $bytes / 1073741824 }"
  elif [ "$bytes" -ge 1048576 ]; then
    awk "BEGIN { printf \"%.2f MB\", $bytes / 1048576 }"
  else
    awk "BEGIN { printf \"%.1f KB\", $bytes / 1024 }"
  fi
}

file_size() { wc -c <"$1" | tr -d ' '; }

is_handled_ext() {
  case "${1,,}" in
    jpg | jpeg | jpe | png | bmp | tif | tiff | webp) return 0 ;;
    *) return 1 ;;
  esac
}

# Google Motion Photos are a still JPEG with a whole MP4 appended after the EOI
# marker. Re-encoding keeps the picture but drops that video, so such files are
# renamed to shed the .MP marker and the report says the video is gone.
is_motion_photo() {
  LC_ALL=C grep -qa 'ftyp' "$1" 2>/dev/null && LC_ALL=C grep -qa 'mdat' "$1" 2>/dev/null
}

# Turns "PXL_1234.MP" into "PXL_1234", leaving any other base name alone.
strip_motion_suffix() {
  case "${1,,}" in
    *.mp) printf '%s' "${1%.*}" ;;
    *) printf '%s' "$1" ;;
  esac
}

# Picks a free filename so we never silently overwrite a neighboring file.
unique_name() {
  local want="$1" src="$2" base ext n=1
  [ "$want" = "$src" ] && { printf '%s' "$want"; return; }
  [ ! -e "$want" ] && { printf '%s' "$want"; return; }
  base="${want%.*}"; ext="${want##*.}"
  while [ -e "$base-$n.$ext" ]; do n=$((n + 1)); done
  printf '%s' "$base-$n.$ext"
}

# Measured quality gate: identical pixels pass outright, otherwise PSNR must
# clear the threshold. ImageMagick reports PSNR as 0 for identical images,
# which is why the absolute-error check has to come first.
passes_quality_gate() {
  local orig="$1" cand="$2" ae psnr
  ae=$("${im_compare[@]}" -metric AE "$orig" "$cand" null: 2>&1 | awk '{print $1}')
  [ "${ae%%.*}" = "0" ] && { printf '%s' "lossless"; return 0; }
  psnr=$("${im_compare[@]}" -metric PSNR "$orig" "$cand" null: 2>&1 | awk '{print $1}')
  case "$psnr" in
    inf | Inf | INF) printf '%s' "lossless"; return 0 ;;
  esac
  awk -v p="$psnr" -v g="$psnr_gate" 'BEGIN { exit !(p + 0 >= g + 0) }' || return 1
  awk -v p="$psnr" 'BEGIN { printf "PSNR %.1f dB", p + 0 }'
  return 0
}

write_rec() {
  local rec="$1"
  {
    printf 'status=%s\n' "$2"
    printf 'name=%s\n' "$3"
    printf 'before=%s\n' "$4"
    printf 'after=%s\n' "$5"
    printf 'note=%s\n' "$6"
  } >"$rec"
}

# Replaces the original with the compressed candidate (or reports the plan
# when running with --dry-run).
commit_result() {
  local img="$1" cand="$2" target="$3"
  if [ "$dry_run" -eq 1 ]; then rm -f "$cand"; return 0; fi
  mkdir -p "$backup_dir"
  cp -p "$img" "$backup_dir/$(basename "$img")" || return 1
  # Carry the original modification time over, so a compressed library keeps
  # the same file dates it had before. Must happen while the source still
  # exists. EXIF is untouched by this: only the filesystem date is copied.
  touch -r "$img" "$cand"
  [ "$img" != "$target" ] && rm -f "$img"
  mv "$cand" "$target"
}

# --- per-image pipelines -----------------------------------------------------

compress_jpeg() {
  local img="$1" rec="$2" before="$3" fmt="$4" srcq="$5" uid="$6"
  local base="${img%.*}" ext="${img##*.}" target cand best="" best_size note
  local mp_note="" is_mp=0

  if [ "$fmt" = "JPEG" ] && is_motion_photo "$img"; then
    is_mp=1
    mp_note=", video removed"
  fi

  # Keep the original filename (and its extension casing) whenever the
  # container does not change; only a real format change earns a new name.
  # A Motion Photo loses its video, so it also loses the .MP marker.
  case "${ext,,}" in
    jpg | jpeg | jpe)
      if [ "$is_mp" -eq 1 ]; then
        target=$(unique_name "$(strip_motion_suffix "$base").$ext" "$img")
      else
        target="$img"
      fi
      ;;
    *) target=$(unique_name "$base.jpg" "$img") ;;
  esac

  # A JPEG already at or below the target would only grow if re-encoded at a
  # higher quality, so it is left alone. jpegoptim can still shave bytes off it
  # losslessly when available.
  if [ "$fmt" = "JPEG" ] && [ -n "$srcq" ] && [ "$srcq" -le "$quality" ]; then
    if [ "$has_jpegoptim" -eq 1 ]; then
      cand="$tmp_root/$uid.opt.jpg"
      cp -p "$img" "$cand"
      jpegoptim "${jpegoptim_strip[@]}" --quiet "$cand" &>/dev/null
      local osize; osize=$(file_size "$cand")
      if [ "$osize" -lt "$before" ]; then
        commit_result "$img" "$cand" "$target" &&
          write_rec "$rec" compressed "$target" "$before" "$osize" "q$srcq kept$mp_note" && return
      fi
      rm -f "$cand"
    fi
    write_rec "$rec" optimal "$img" "$before" "$before" "q$srcq kept"
    return
  fi

  # Baseline and progressive encodings differ by a few percent and neither wins
  # consistently, so both are produced and the smaller one is kept.
  local variant size
  for variant in baseline progressive; do
    cand="$tmp_root/$uid.$variant.jpg"
    if [ "$variant" = progressive ]; then
      "${im_convert[@]}" "$img" -quality "$quality" -sampling-factor 4:2:0 \
        -interlace JPEG "${strip_args[@]}" "$cand" &>/dev/null
    else
      "${im_convert[@]}" "$img" -quality "$quality" -sampling-factor 4:2:0 \
        -interlace none "${strip_args[@]}" "$cand" &>/dev/null
    fi
    [ -s "$cand" ] || { rm -f "$cand"; continue; }
    size=$(file_size "$cand")
    if [ -z "$best" ] || [ "$size" -lt "$best_size" ]; then
      rm -f "$best"; best="$cand"; best_size="$size"
    else
      rm -f "$cand"
    fi
  done

  if [ -z "$best" ]; then
    write_rec "$rec" unhandled "$img" "$before" "$before" "File not handled (encoding failed)"
    return
  fi

  if [ "$best_size" -gt 0 ] && [ "$best_size" -lt "$before" ]; then
    note="q${srcq:-?} -> q$quality$mp_note"
    [ "$fmt" != "JPEG" ] && note="$fmt -> JPEG q$quality"
    commit_result "$img" "$best" "$target" &&
      write_rec "$rec" compressed "$target" "$before" "$best_size" "$note"
  else
    rm -f "$best"
    write_rec "$rec" kept "$img" "$before" "$before" "re-encoding was larger"
  fi
}

compress_png() {
  local img="$1" rec="$2" before="$3" fmt="$4" uid="$5"
  local base="${img%.*}" ext="${img##*.}" target cand best="" best_size best_note size gate_note

  case "${ext,,}" in
    png) target="$img" ;;
    *) target=$(unique_name "$base.png" "$img") ;;
  esac

  # Candidate 1: strictly lossless re-encode (always passes the gate).
  cand="$tmp_root/$uid.lossless.png"
  "${im_convert[@]}" "$img" "${strip_args[@]}" -define png:compression-level=9 \
    -define png:compression-strategy=1 "$cand" &>/dev/null
  if [ -s "$cand" ]; then
    best="$cand"; best_size=$(file_size "$cand"); best_note="lossless"
  else
    rm -f "$cand"
  fi

  # Candidate 2: 256-color palette without dithering. Dithering costs both
  # fidelity and size on the flat-color art that PNG is usually used for.
  cand="$tmp_root/$uid.quant.png"
  "${im_convert[@]}" "$img" "${strip_args[@]}" -dither None -colors 256 \
    -define png:compression-level=9 "$cand" &>/dev/null
  if [ -s "$cand" ]; then
    size=$(file_size "$cand")
    if [ -z "$best" ] || [ "$size" -lt "$best_size" ]; then
      if gate_note=$(passes_quality_gate "$img" "$cand"); then
        rm -f "$best"; best="$cand"; best_size="$size"; best_note="256 colors, $gate_note"
      else
        rm -f "$cand"
      fi
    else
      rm -f "$cand"
    fi
  fi

  # Candidate 3: pngquant, when installed, usually beats ImageMagick's palette.
  if [ "$has_pngquant" -eq 1 ]; then
    cand="$tmp_root/$uid.pngquant.png"
    pngquant --quality=70-100 --speed 1 "${pngquant_strip[@]}" --force --output "$cand" -- "$img" &>/dev/null
    if [ -s "$cand" ]; then
      size=$(file_size "$cand")
      if [ -z "$best" ] || [ "$size" -lt "$best_size" ]; then
        if gate_note=$(passes_quality_gate "$img" "$cand"); then
          rm -f "$best"; best="$cand"; best_size="$size"; best_note="pngquant, $gate_note"
        else
          rm -f "$cand"
        fi
      else
        rm -f "$cand"
      fi
    fi
  fi

  if [ -z "$best" ]; then
    write_rec "$rec" unhandled "$img" "$before" "$before" "File not handled (encoding failed)"
    return
  fi

  if [ "$best_size" -gt 0 ] && [ "$best_size" -lt "$before" ]; then
    [ "$fmt" != "PNG" ] && best_note="$fmt -> PNG, $best_note"
    commit_result "$img" "$best" "$target" &&
      write_rec "$rec" compressed "$target" "$before" "$best_size" "$best_note"
  else
    rm -f "$best"
    write_rec "$rec" kept "$img" "$before" "$before" "already well compressed"
  fi
}

process_one() {
  local img="$1" rec="$2"
  local before ext probe fmt alpha srcq uid

  # $$ is the parent shell PID even inside a background job, so temp files must
  # be keyed on something unique per image instead.
  uid=$(basename "$rec" .rec)
  before=$(file_size "$img")
  ext="${img##*.}"

  if [ "$img" = "$ext" ] || ! is_handled_ext "$ext"; then
    write_rec "$rec" unhandled "$img" "$before" "$before" "File not handled (.${ext,,})"
    return
  fi

  probe=$("${im_identify[@]}" -format '%m|%A|%Q\n' "$img" 2>/dev/null | head -1)
  if [ -z "$probe" ]; then
    write_rec "$rec" unhandled "$img" "$before" "$before" "File not handled (not a readable image)"
    return
  fi

  fmt="${probe%%|*}"
  alpha=$(printf '%s' "$probe" | cut -d'|' -f2)
  srcq=$(printf '%s' "$probe" | cut -d'|' -f3)
  [[ "$srcq" =~ ^[0-9]+$ ]] || srcq=""

  # Transparency decides the container: anything with an alpha channel goes
  # down the PNG path so it can never be flattened onto a black background.
  if [ "${ext,,}" = "png" ] || [ "$alpha" = "True" ] || [ "$alpha" = "Blend" ]; then
    compress_png "$img" "$rec" "$before" "$fmt" "$uid"
  else
    compress_jpeg "$img" "$rec" "$before" "$fmt" "$srcq" "$uid"
  fi
}

# --- collect files -----------------------------------------------------------

mapfile -t files < <(find . -maxdepth 1 -type f -printf '%P\n' 2>/dev/null | LC_ALL=C sort)

if [ ${#files[@]} -eq 0 ]; then
  echo "No files found in $(pwd)."
  exit 0
fi

tmp_root=$(mktemp -d)
rec_dir="$tmp_root/rec"
mkdir -p "$rec_dir"
trap 'rm -rf "$tmp_root"' EXIT

mode_label="Compressing"
mode_color="$c_green"
if [ "$dry_run" -eq 1 ]; then
  mode_label="Previewing (dry run)"
  mode_color="$c_yellow"
fi
printf ' %s%s%s %d file(s) in %s%s%s\n' \
  "$c_bold$mode_color" "$mode_label" "$c_reset" "${#files[@]}" "$c_cyan" "$(pwd)" "$c_reset"
printf ' %sJPEG quality q%s | PNG gate %s dB | %s job(s)%s\n' \
  "$c_dim" "$quality" "$psnr_gate" "$jobs" "$c_reset"
if [ "$keep_metadata" -eq 1 ]; then
  printf ' %sMetadata : kept%s\n' "$c_dim" "$c_reset"
else
  printf ' %sMetadata : stripped%s\n' "$c_yellow" "$c_reset"
fi
echo ""

# --- run ---------------------------------------------------------------------

throttle() {
  while [ "$(jobs -rp | wc -l)" -ge "$jobs" ]; do
    wait -n 2>/dev/null || break
  done
}

idx=0
for img in "${files[@]}"; do
  rec=$(printf '%s/%05d.rec' "$rec_dir" "$idx")
  idx=$((idx + 1))
  if [ "$jobs" -gt 1 ]; then
    throttle
    process_one "$img" "$rec" &
  else
    process_one "$img" "$rec"
  fi
done
wait

# --- report ------------------------------------------------------------------

# Color is wrapped around each padded field rather than embedded in it: the
# escape bytes would otherwise be counted toward the %-16s width and skew every
# column to the right.
print_row() {
  local status_color="$1" status_text="$2" name="$3" before="$4" after="$5"
  local change_color="$6" change="$7" note="$8" note_color="$c_dim"
  case "$note" in
    *"video removed"*) note_color="$c_yellow" ;;
  esac
  printf ' %s%-16s%s %-44s %10s %10s %s%8s%s  %s%s%s\n' \
    "$status_color" "$status_text" "$c_reset" "$name" "$before" "$after" \
    "$change_color" "$change" "$c_reset" "$note_color" "$note" "$c_reset"
}

printf ' %s%-16s %-44s %10s %10s %8s  %s%s\n' "$c_bold" STATUS FILE BEFORE AFTER CHANGE NOTE "$c_reset"
printf ' %s%s%s\n' "$c_dim" "$(printf '%.0s-' {1..118})" "$c_reset"

total_before=0
total_after=0
n_compressed=0
n_optimal=0
n_kept=0
n_unhandled=0
unhandled_bytes=0

for rec in "$rec_dir"/*.rec; do
  [ -f "$rec" ] || continue
  status=""; name=""; before=0; after=0; note=""
  while IFS='=' read -r key value; do
    case "$key" in
      status) status="$value" ;;
      name) name="$value" ;;
      before) before="$value" ;;
      after) after="$value" ;;
      note) note="$value" ;;
    esac
  done <"$rec"

  short="$name"
  [ ${#short} -gt 44 ] && short="${short:0:41}..."

  case "$status" in
    compressed)
      change=$(awk -v a="$after" -v b="$before" 'BEGIN { printf "%+d%%", (a - b) * 100 / b }')
      print_row "$c_green" "compressed" "$short" \
        "$(human_size "$before")" "$(human_size "$after")" "$c_green" "$change" "$note"
      n_compressed=$((n_compressed + 1))
      total_before=$((total_before + before)); total_after=$((total_after + after))
      ;;
    optimal)
      print_row "$c_cyan" "already optimal" "$short" \
        "$(human_size "$before")" "$(human_size "$after")" "$c_dim" "0%" "$note"
      n_optimal=$((n_optimal + 1))
      total_before=$((total_before + before)); total_after=$((total_after + after))
      ;;
    kept)
      print_row "$c_yellow" "kept original" "$short" \
        "$(human_size "$before")" "$(human_size "$after")" "$c_dim" "0%" "$note"
      n_kept=$((n_kept + 1))
      total_before=$((total_before + before)); total_after=$((total_after + after))
      ;;
    unhandled)
      print_row "$c_dim" "File not handled" "$short" \
        "$(human_size "$before")" "-" "$c_dim" "-" "$note"
      n_unhandled=$((n_unhandled + 1))
      unhandled_bytes=$((unhandled_bytes + before))
      ;;
  esac
done

printf ' %s%s%s\n' "$c_dim" "$(printf '%.0s-' {1..118})" "$c_reset"
printf ' %s%d compressed%s %s|%s %s%d already optimal%s %s|%s %s%d kept as-is%s %s|%s %s%d not handled%s\n' \
  "$c_green" "$n_compressed" "$c_reset" "$c_dim" "$c_reset" \
  "$c_cyan" "$n_optimal" "$c_reset" "$c_dim" "$c_reset" \
  "$c_yellow" "$n_kept" "$c_reset" "$c_dim" "$c_reset" \
  "$c_dim" "$n_unhandled" "$c_reset"

if [ "$n_compressed" -gt 0 ]; then
  printf ' %sOriginals of the %d modified file(s) are in ./%s%s\n' \
    "$c_dim" "$n_compressed" "$backup_dir" "$c_reset"
fi

if [ "$total_before" -gt 0 ]; then
  saved=$((total_before - total_after))
  percent_total=$((total_after * 100 / total_before))
  printf ' Before : %s\n' "$(human_size "$total_before")"
  printf ' After  : %s\n' "$(human_size "$total_after")"
  printf ' Saved  : %s%s%s %s(%d%% of original size remains)%s\n' \
    "$c_bold$c_green" "$(human_size "$saved")" "$c_reset" \
    "$c_dim" "$percent_total" "$c_reset"
fi

if [ "$n_unhandled" -gt 0 ]; then
  printf ' %sUntouched non-image data : %s%s\n' "$c_dim" "$(human_size "$unhandled_bytes")" "$c_reset"
fi

if [ "$dry_run" -eq 1 ]; then
  echo ""
  printf ' %sDry run : no file was modified and no backup was written.%s\n' "$c_yellow" "$c_reset"
fi

echo ""
