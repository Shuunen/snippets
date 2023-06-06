#!/bin/bash

alias ..='cd ..' 
alias apt='sudo apt' 
alias install='sudo apt install' 
alias ll="ls -lv --almost-all --no-group --human-readable --classify --group-directories-first --time-style=long-iso --color=auto"
alias merge=meld 
alias mkdir='mkdir -pv' 
alias psg='ps aux | grep -v grep | grep -i -e VSZ -e'
alias regenLock="rm node_modules/ -rf && rm pnpm-lock.yaml && pnpm i && pnpm outdated"
alias updateLock="pnpm update && git checkout package.json && pnpm i && pnpm outdated"
alias whatsmyip='curl http://ipecho.net/plain; echo' 

PATH="$PATH:$HOME/.npm-global/bin"

echo '' 
screenfetch 
echo ' Hey there ^^ Have a nice day!' 
echo ''
