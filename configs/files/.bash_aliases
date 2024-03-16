#!/bin/bash

alias ..='cd ..' 
alias ll="ls -lv --almost-all --no-group --human-readable --classify --group-directories-first --time-style=long-iso --color=auto"
alias merge=meld 
alias mkdir='mkdir -pv' 
alias psg='ps aux | grep -v grep | grep -i -e VSZ -e'
alias regenLock="rm node_modules/ -rf && rm pnpm-lock.yaml && pnpm i && pnpm outdated"
alias updateLock="pnpm update && git checkout package.json && pnpm i && pnpm outdated"
alias whatsmyip='curl http://ipecho.net/plain; echo' 

if ! [[ "$PATH" =~ .npm-global/bin ]]; then PATH="$PATH:$HOME/.npm-global/bin"; elif ! [[ "$PATH" =~ .npm-global ]]; then PATH="$PATH:$HOME/.npm-global"; fi
if ! [[ "$PATH" =~ .local/share/applications ]]; then PATH="$PATH:$HOME/.local/share/applications"; fi
if ! [[ "$PATH" =~ snippets/one-file ]]; then PATH="$PATH:$HOME/Projects/github/snippets/one-file"; fi

echo '' 
neofetch 
echo ' Hey there ^^ Have a nice day!' 
echo ''
