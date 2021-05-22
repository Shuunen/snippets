#!/bin/sh

# Based on :
# - http://www.alfredklomp.com/programming/shrinkpdf
# - https://github.com/jbenet/compress-pdf/blob/master/compress-pdf
# - https://github.com/theeko74/pdfc/blob/master/pdf_compressor.py

output="temp.pdf"

shrink() {
  gswin64c \
    -q -dNOPAUSE -dBATCH \
    -sDEVICE=pdfwrite \
    -dCompatibilityLevel=1.4 \
    -dPDFSETTINGS="//$2" \
    -sOutputFile="$output" \
    "$1"
}

check_smaller() {
  if [ ! -f "$1" -o ! -f "$2" ]; then
    return 0
  fi
  input=$1
  inSize="$(echo $(wc -c "$input") | cut -f1 -d\ )"
  outSize="$(echo $(wc -c "$2") | cut -f1 -d\ )"
  percent=$((outSize * 100 / inSize * 100 / 100))
  if ((percent > 0 && percent < 99)); then
    mv "$output" "$input"
    echo " $input : compressed, file size reduced to $percent% of the original."
  else
    rm "$output"
    echo " $input : compressed file is not smaller, nothing done."
  fi
}

if [ ! -z "$1" ]; then
  input="$1"
else
  echo ""
  echo " Usage: shrink-pdf.sh my-file.pdf"
  echo "  for a better quality : shrink-pdf.sh my-file.pdf 1"
  exit 1
fi

if [ ! -z "$2" ]; then
  quality="default"
else
  quality="ebook"
fi

shrink "$input" "$quality" || exit $?

check_smaller "$input" "$output"
