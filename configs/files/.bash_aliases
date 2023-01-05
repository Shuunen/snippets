#!/bin/bash

alias ..='cd ..' 
alias install='sudo apt install' 
alias apt='sudo apt' 
alias mkdir='mkdir -pv' 
alias merge=meld 
alias whatsmyip='curl http://ipecho.net/plain; echo' 
alias psg='ps aux | grep -v grep | grep -i -e VSZ -e'

PATH="$PATH:$HOME/.npm-global/bin"

echo '' 
screenfetch 
echo ' Welcome huei ^^' 
echo ''
