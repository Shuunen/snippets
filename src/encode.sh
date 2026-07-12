#!/bin/sh

# use me like this :
# $ encode.sh "video-stuff-foobar.mkv"
# will default to :
# $ encode.sh "video-stuff-foobar.mkv" 24 medium
# and generate : video-medium-crf24-grain.mkv
# instead of "medium" you can also use "slow" or "fast"
# lower crf value for better quality but bigger file size

# basic="crf=22:strong-intra-smoothing=0:rect=0:aq-mode=3"
# rarbg avg bitrate 2000 kbps is pretty much equivalent to crf 22
# but their other settings make the result looking nicer than the basic settings above
# rarbg="aq-mode=3:bitrate=2000:frame-threads=4:hist-threshold=0.01:max-luma=1023:no-sao=1:rc=abr:rect=1:selective-sao=0:strong-intra-smoothing=1"
# doom9="crf=22:qcomp=0.8:aq-mode=1:aq_strength=1.0:qg-size=16:psy-rd=0.7:psy-rdoq=5.0:rdoq-level=1:merange=44"

crf="${2:-24}"
preset="${3:-medium}" # fast / medium / slow
tune="grain"
input="$(basename -- "${1%.*}")"
input="$(printf '%s\n' "$input" | sed -E 's/^([^. _]+([. _][^. _]+)?).*/\1/')"
title="$input-$preset-crf$crf-$tune"
encode_start="$(date +%s)"
sample="" # use `-ss 00:00:57 -t 10` for example to extract 10s starting at 57s

meta=""
if [ -n "$sample" ]; then
  meta="-metadata title=$title"
fi

# shellcheck disable=SC2086 # $sample and $meta are meant to expand into multiple ffmpeg args (or nothing)
ffmpeg -hide_banner -y -loglevel warning -stats \
  $sample \
  -i "$1" \
  $meta \
  -map 0 \
  -c:v libx265 -preset "$preset" -crf "$crf" -tune "$tune" \
  -c:a copy \
  -c:s copy \
  "$title.mkv" || { echo "ffmpeg failed, aborting" >&2; exit 1; }

encode_elapsed="$(($(date +%s) - encode_start))"

# enable video conversion in x265, preset slow and some custom params
# -c:v libx265 -preset slow -x265-params $rarbg \
# https://x265.readthedocs.io/en/master/presets.html
# here use the default medium preset (same quality but bigger file size and faster encodes)
# also using crf 24 with a grain tune
# -c:v libx265 -preset medium -crf 24 -tune grain \
# https://x265.readthedocs.io/en/master/presets.html#film-grain

# set 10bit instead of the 8bit by default
# -pix_fmt yuv420p10le \

# apply video filter, here a light sharpening filter
# -vf unsharp=3:3:1.5 \
# and even lighter :
# -vf unsharp=3:3:1 \
# for a stronger filter, use simply : -vf unsharp \

# copy metadata & chapters as is
# -map_metadata 0
# -map_chapters 0

# here we take streams 0,2 & 12, whatever it is (video, audio, sub)
# -map 0:0
# -map 0:2
# -map 0:12
# to take all streams just : -map 0
#   / \                                                                / \
#  / ! \  mapping badly encoded subtitles can slow the whole process  / ! \
# -------                                                            -------

# ask ffmpeg to stream copy directly audio & subtitles
# -c:a copy
# -c:s copy

# to extract a single frame
# ffmpeg -hide_banner -y \
#   -ss 00:00:17 \
#   -i "$2.mkv" \
#   -frames:v 1 -q:v 1 \
#   "$HOME/Pictures/$2.jpg"

# take-screenshot.sh "$title.mkv" 5

# to check crop-able area
# ffplay -ss 00:10:00 -t 2 -i "input.mkv" -vf cropdetect=24:16:0
# look at the logs in the bash and then copy/paste the detected crop values into ffmpeg parameters, here for example :
# -vf crop=1920:816:0:132 \

# to crop without re-encoding the video :
# mkvpropedit "input.mkv" --edit track:v1 --set pixel-crop-left=310 --set pixel-crop-right=200 --set pixel-crop-top=0 --set pixel-crop-bottom=0

# to just extract the audio use this ffmpeg command :
# ffmpeg -hide_banner -y -i "video.mkv" -map 0:a -c:a copy "audio.mka"

human_time() { # $1 = seconds
  s=$1
  if [ "$s" -lt 60 ]; then
    echo "${s}s"
    return
  fi
  if [ "$s" -lt 3600 ]; then
    m=$((s / 60))
    rem=$((s % 60))
    [ "$rem" -eq 0 ] && echo "${m}min" || echo "${m}min ${rem}s"
    return
  fi
  h=$((s / 3600))
  rem=$((s % 3600))
  m=$(((rem + 30) / 60)) # round(rem / 60)
  if [ "$m" -eq 60 ]; then
    h=$((h + 1))
    m=0
  fi
  [ "$m" -eq 0 ] && echo "${h}h" || echo "${h}h ${m}min"
}

human_size() { # $1 = bytes
  b=$1
  mb_unit=$((1024 * 1024))
  gb_unit=$((1024 * 1024 * 1024))
  if [ "$b" -lt "$mb_unit" ]; then
    kb=$(((b + 512) / 1024)) # round(b / 1024)
    echo "${kb}KB"
    return
  fi
  if [ "$b" -lt "$gb_unit" ]; then
    mb=$((b / mb_unit))
    rem=$((b % mb_unit))
    kb=$(((rem + 512) / 1024)) # round(rem / 1024)
    if [ "$kb" -eq 1024 ]; then
      mb=$((mb + 1))
      kb=0
    fi
    [ "$kb" -eq 0 ] && echo "${mb}MB" || echo "${mb}MB ${kb}KB"
    return
  fi
  gb=$((b / gb_unit))
  rem=$((b % gb_unit))
  mb=$(((rem + mb_unit / 2) / mb_unit)) # round(rem / mb_unit)
  if [ "$mb" -eq 1024 ]; then
    gb=$((gb + 1))
    mb=0
  fi
  [ "$mb" -eq 0 ] && echo "${gb}GB" || echo "${gb}GB ${mb}MB"
}

# evaluate the size of a full-length encoding when only an extract was encoded
source_duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")"
output_duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$title.mkv")"
source_size="$(wc -c < "$1")"
output_size="$(wc -c < "$title.mkv")"

echo ""
echo "Encoding done in $(human_time "$encode_elapsed")"
echo "Source size : $(human_size "$source_size")"
echo "Encode size : $(human_size "$output_size")"

if [ -n "$sample" ]; then
  # durations from ffprobe are floats (e.g. 57.033333); truncate to whole
  # seconds since this is only an estimate for the full-length encoding
  source_duration_int="${source_duration%.*}"
  output_duration_int="${output_duration%.*}"
  if [ -z "$output_duration_int" ] || [ "$output_duration_int" -eq 0 ]; then
    echo "Could not determine sample duration, skipping full-length estimate" >&2
  else
    expected_size=$((output_size * source_duration_int / output_duration_int))
    expected_time=$((encode_elapsed * source_duration_int / output_duration_int))
    echo "Expected full encoding time : $(human_time "$expected_time")"
    echo "Expected full encoding size : $(human_size "$expected_size")"
    mv "$title.mkv" "$title - expected $(human_size "$expected_size") in $(human_time "$expected_time").mkv"
  fi
fi
