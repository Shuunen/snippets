#!/bin/sh

# use me like this :
# $ encode.sh "video-stuff-foobar.mkv"
# will default to :
# $ encode.sh "input file" 24 medium
# and generate : video-medium-crf24-grain.mkv

# basic="crf=22:strong-intra-smoothing=0:rect=0:aq-mode=3"
# rarbg avg bitrate 2000 kbps is pretty much equivalent to crf 22
# but their other settings make the result looking nicer than the basic settings above
# rarbg="aq-mode=3:bitrate=2000:frame-threads=4:hist-threshold=0.01:max-luma=1023:no-sao=1:rc=abr:rect=1:selective-sao=0:strong-intra-smoothing=1"
# doom9="crf=22:qcomp=0.8:aq-mode=1:aq_strength=1.0:qg-size=16:psy-rd=0.7:psy-rdoq=5.0:rdoq-level=1:merange=44"

crf="${2:-24}"
preset="${3:-medium}" # fast / medium / slow
tune="grain"
input="$(echo "$1" | sed 's/[\. \_].*//')" # get the first word of the input filename
title="$input-$preset-crf$crf-$tune"

ffmpeg -hide_banner -y \
  -ss 00:20:21 -t 10 \
  -i "$1" \
  -metadata title="$title" \
  -map 0 \
  -c:v libx265 -preset "$preset" -crf "$crf" -tune "$tune" \
  -c:a copy \
  -c:s copy \
  "$title.mkv"

# only extract 60 seconds starting at 8 min 30 sec
# -ss 00:08:30 -t 60 \
#   / \                                  / \
#  / ! \  needs to be placed before -i  / ! \
# -------                              -------

# input file & output file metadata title
# -i "$1" \
# -metadata title="$2" \

# enable video convertion in x265, preset slow and some custom params
# -c:v libx265 -preset slow -x265-params $rarbg \
# https://x265.readthedocs.io/en/master/presets.html
# here use the default medium preset (same quality but bigger file size and faster encodes)
# also using crf 24 with a grain tune
# -c:v libx265 -preset medium -crf 24 -tune grain \
# https://x265.readthedocs.io/en/master/presets.html#film-grain

# set 10bit instead of the 8bit by default
# -pix_fmt yuv420p10le

# apply video filter, here a light sharpening filter
# -vf unsharp=3:3:1.5 \
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

take-screenshot.sh "$title.mkv" 5

# to check croppable area
# ffplay -ss 00:10:00 -t 2 -i "input.mkv" -vf cropdetect=24:16:0
# then in ffmpeg
# -vf crop=1920:816:0:132 \
