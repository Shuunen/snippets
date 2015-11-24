#!/bin/bash
#
# Usage: install.sh

# Stops execution if any command fails.
set -eo pipefail

createLinkSafely() {
  link="$1"
  targetDirectory=$(dirname "$link")
  file="$2"
  # Creates directory if it doesn't exist.
  if [ ! -d "$targetDirectory" ]; then
    echo "install: Creating directory $targetDirectory."
    mkdir -p "$targetDirectory"
  fi
  # Creates link if file doesn't exist.
  if [[ ! -f "$link" ]]; then
    echo "installed : $link"
    ln -s $(pwd)/"$file" "$link"
  # else
  #  echo "install: Did not create link $link, because file with same name already exists."
  fi
}

#echo "install aliases..."
# alias grep='grep --color'
# alias ll='ls -la'


echo "install utils..."
createLinkSafely treesize /usr/local/bin/treesize