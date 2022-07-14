#!/bin/sh

# Based on :
# - http://www.alfredklomp.com/programming/shrinkpdf
# - https://github.com/jbenet/compress-pdf/blob/master/compress-pdf
# - https://github.com/theeko74/pdfc/blob/master/pdf_compressor.py

# Command on Window : /c/Program Files/gs/gs9.56.1/bin/gswin64 -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -sOutputFile="temp.pdf" "out.pdf"

temp="temp.pdf"

if [ ! -z "$1" ]; then
  input="$1"
else
  echo ""
  echo " Usage: shrink-pdf.sh my-file.pdf"
  exit 1
fi

shrink() {
  ghostscript \
    -q -dNOPAUSE -dBATCH \
    -sDEVICE=pdfwrite \
    -dCompatibilityLevel=1.4 \
    -sOutputFile="$temp" \
    "$input"
}

check_smaller() {
  inSize=$(wc -c "$input" | cut -f1 -d\ )
  outSize=$(wc -c "$temp" | cut -f1 -d\ )
  percent=$((outSize * 100 / inSize * 100 / 100))
  if [ "$percent" -ge 0 ] && [ "$percent" -le 99 ]; then
    mv "$temp" "$input"
    echo " $input : compressed, file size reduced to $percent% of the original."
    if command -v zenity &>/dev/null; then zenity --notification --text "$input size reduced to $percent% of the original"; fi
  else
    rm "$temp"
    echo " $input : compressed file is not smaller, nothing done."
    if command -v zenity &>/dev/null; then zenity --notification --text "$input cannot be more compressed"; fi
  fi
}

shrink || exit $?

check_smaller
