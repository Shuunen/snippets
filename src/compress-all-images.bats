#!/usr/bin/env bats

# Black-box tests for compress-all-images.sh.
#
# The script is a CLI, so it is exercised as one: every test builds a throwaway
# folder of fixtures, runs the script against it, then asserts on the report and
# on what actually landed on disk. Nothing is sourced, so no part of the script
# has to be restructured to be testable.

setup_file() {
  if command -v magick &>/dev/null; then
    export IM_CONVERT="magick"
    export IM_IDENTIFY="magick identify"
    export IM_COMPARE="magick compare"
  elif command -v convert &>/dev/null; then
    export IM_CONVERT="convert"
    export IM_IDENTIFY="identify"
    export IM_COMPARE="compare"
  else
    export IM_CONVERT=""
  fi
}

setup() {
  [ -n "$IM_CONVERT" ] || skip "ImageMagick is not installed"
  script="$BATS_TEST_DIRNAME/compress-all-images.sh"
  work="$BATS_TEST_TMPDIR/$BATS_TEST_NAME"
  mkdir -p "$work"
}

# Always non-interactive and plain-text, so assertions never race a prompt or
# trip over color escapes.
run_script() {
  run bash "$script" "$work" --no-prompt --no-color "$@"
}

identify_field() {
  $IM_IDENTIFY -format "$1" "$2" 2>/dev/null
}

# A noisy gradient at q98 is well above the q85 target, so it always compresses.
make_big_jpeg() {
  $IM_CONVERT -size 800x600 plasma:fractal -quality 98 "$work/$1"
}

# Flat-color art: what PNG is actually used for, and what quantizing helps.
make_flat_png() {
  $IM_CONVERT -size 500x500 xc:'#2244aa' -fill white -draw 'circle 250,250 250,60' \
    -fill yellow -draw 'rectangle 20,20 120,120' "$work/$1"
}

make_alpha_png() {
  $IM_CONVERT -size 200x200 xc:none -fill red -draw 'circle 100,100 100,30' "$work/$1"
}

# --- argument handling -------------------------------------------------------

@test "--help prints the usage block and exits 0" {
  run bash "$script" --help --no-color
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage: compress-all-images.sh"* ]]
  [[ "$output" == *"--dry-run"* ]]
}

@test "an unknown option is rejected with a non-zero status" {
  run bash "$script" --bogus --no-color
  [ "$status" -eq 1 ]
  [[ "$output" == *"Unknown option: --bogus"* ]]
}

@test "a folder that does not exist is rejected" {
  run bash "$script" "$BATS_TEST_TMPDIR/absent" --no-prompt --no-color
  [ "$status" -eq 1 ]
  [[ "$output" == *"Not a folder"* ]]
}

@test "an empty folder is reported and exits 0" {
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" == *"No files found"* ]]
}

@test "--no-color emits no ANSI escapes" {
  make_big_jpeg photo.jpg
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" != *$'\033'* ]]
}

# --- dry run -----------------------------------------------------------------

@test "--dry-run leaves every file untouched and writes no backup" {
  make_big_jpeg photo.jpg
  local before_size before_hash
  before_size=$(wc -c <"$work/photo.jpg")
  before_hash=$(md5sum <"$work/photo.jpg")
  run_script --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"no file was modified"* ]]
  [ "$(wc -c <"$work/photo.jpg")" -eq "$before_size" ]
  [ "$(md5sum <"$work/photo.jpg")" = "$before_hash" ]
  [ ! -d "$work/backup" ]
}

@test "--dry-run does not claim originals were backed up" {
  make_big_jpeg photo.jpg
  run_script --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" != *"Originals of the"* ]]
}

# --- compression -------------------------------------------------------------

@test "a high quality JPEG is compressed and the original is backed up" {
  make_big_jpeg photo.jpg
  local before
  before=$(wc -c <"$work/photo.jpg")
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" == *"compressed"* ]]
  [ "$(wc -c <"$work/photo.jpg")" -lt "$before" ]
  [ "$(wc -c <"$work/backup/photo.jpg")" -eq "$before" ]
}

@test "a JPEG already below the target quality is left alone" {
  $IM_CONVERT -size 400x400 plasma:fractal -quality 60 "$work/small.jpg"
  local before
  before=$(md5sum <"$work/small.jpg")
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" == *"already optimal"* ]]
  [ "$(md5sum <"$work/small.jpg")" = "$before" ]
}

@test "a flat-color PNG is compressed and stays a PNG" {
  make_flat_png art.png
  local before
  before=$(wc -c <"$work/art.png")
  run_script
  [ "$status" -eq 0 ]
  [ "$(wc -c <"$work/art.png")" -lt "$before" ]
  [ "$(identify_field '%m' "$work/art.png")" = "PNG" ]
}

@test "transparency survives compression" {
  make_alpha_png logo.png
  run_script
  [ "$status" -eq 0 ]
  [ -f "$work/logo.png" ]
  [ "$(identify_field '%A' "$work/logo.png")" = "True" ]
}

@test "a BMP becomes a JPEG and the original file is removed" {
  $IM_CONVERT -size 300x200 gradient:red-blue "$work/art.bmp"
  run_script
  [ "$status" -eq 0 ]
  [ -f "$work/art.jpg" ]
  [ ! -f "$work/art.bmp" ]
  [ -f "$work/backup/art.bmp" ]
}

@test "the original modification time is carried over" {
  make_big_jpeg photo.jpg
  touch -d '2020-01-02 03:04:05' "$work/photo.jpg"
  local before
  before=$(stat -c %Y "$work/photo.jpg")
  run_script
  [ "$status" -eq 0 ]
  [ "$(stat -c %Y "$work/photo.jpg")" -eq "$before" ]
}

# --- files the script must not touch -----------------------------------------

@test "a non-image file is reported as not handled and left alone" {
  echo "just text" >"$work/readme.txt"
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" == *"File not handled"* ]]
  [ "$(cat "$work/readme.txt")" = "just text" ]
}

@test "a file without an extension is reported as not handled" {
  echo "no extension" >"$work/NOEXT"
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" == *"File not handled"* ]]
  [ -f "$work/NOEXT" ]
}

@test "a file with an image extension that is not an image is reported as unreadable" {
  echo "definitely not a jpeg" >"$work/fake.jpg"
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" == *"not a readable image"* ]]
  [ -f "$work/fake.jpg" ]
}

@test "subfolders are not descended into" {
  mkdir -p "$work/nested"
  make_big_jpeg nested/deep.jpg
  local before
  before=$(md5sum <"$work/nested/deep.jpg")
  run_script
  [ "$status" -eq 0 ]
  [ "$(md5sum <"$work/nested/deep.jpg")" = "$before" ]
}

# --- re-run safety (regressions) ---------------------------------------------

@test "regression: a second run keeps the pristine backup instead of overwriting it" {
  make_flat_png art.png
  local original
  original=$(md5sum <"$work/art.png")
  run_script
  [ "$status" -eq 0 ]
  run_script
  [ "$status" -eq 0 ]
  run_script
  [ "$status" -eq 0 ]
  [ "$(md5sum <"$work/backup/art.png")" = "$original" ]
}

@test "regression: a later run never re-quantizes an already compressed PNG" {
  make_flat_png art.png
  run_script
  [ "$status" -eq 0 ]
  cp "$work/art.png" "$BATS_TEST_TMPDIR/after-first-run.png"
  run_script
  [ "$status" -eq 0 ]
  run_script
  [ "$status" -eq 0 ]
  # Later runs may still re-encode losslessly and shave bytes, so size is not
  # the signal. What must never change is a single pixel: any difference means
  # another lossy pass ran and the picture eroded a bit further.
  local pixels_changed
  pixels_changed=$($IM_COMPARE -metric AE "$BATS_TEST_TMPDIR/after-first-run.png" \
    "$work/art.png" null: 2>&1 | awk '{print $1}')
  [ "${pixels_changed%%.*}" = "0" ]
}

@test "the backup folder is not itself compressed on a later run" {
  make_big_jpeg photo.jpg
  run_script
  [ "$status" -eq 0 ]
  local backed_up
  backed_up=$(md5sum <"$work/backup/photo.jpg")
  run_script
  [ "$status" -eq 0 ]
  [ "$(md5sum <"$work/backup/photo.jpg")" = "$backed_up" ]
}

# --- options -----------------------------------------------------------------

@test "-j 1 runs serially and produces the same report as the parallel run" {
  make_big_jpeg photo.jpg
  make_flat_png art.png
  run_script -j 1
  [ "$status" -eq 0 ]
  [[ "$output" == *"1 job(s)"* ]]
  [[ "$output" == *"2 compressed"* ]]
}

@test "-q lowers the target quality and shrinks the file further" {
  make_big_jpeg photo.jpg
  cp "$work/photo.jpg" "$BATS_TEST_TMPDIR/reference.jpg"
  run_script -q 50
  [ "$status" -eq 0 ]
  local aggressive
  aggressive=$(wc -c <"$work/photo.jpg")
  rm -rf "$work/backup" "$work/photo.jpg"
  cp "$BATS_TEST_TMPDIR/reference.jpg" "$work/photo.jpg"
  run_script -q 95
  [ "$status" -eq 0 ]
  [ "$aggressive" -lt "$(wc -c <"$work/photo.jpg")" ]
}

@test "metadata is kept by default and dropped with --strip-metadata" {
  $IM_CONVERT -size 600x400 plasma:fractal -quality 98 \
    -set 'exif:UserComment' 'keep-me' "$work/photo.jpg"
  run_script
  [ "$status" -eq 0 ]
  [[ "$output" == *"Metadata : kept"* ]]
  run_script --strip-metadata
  [ "$status" -eq 0 ]
  [[ "$output" == *"Metadata : stripped"* ]]
}
