#!/bin/bash

alias ..='cd ..' 
alias ll="ls -lv --almost-all --no-group --human-readable --classify --group-directories-first --time-style=long-iso --color=auto"
alias merge=meld 
alias mkdir='mkdir -pv' 
alias psg='ps aux | grep -v grep | grep -i -e VSZ -e'
alias regenLock="rm node_modules/ -rf && rm pnpm-lock.yaml && pnpm i && pnpm outdated"
alias updateLock="pnpm update && git checkout package.json && pnpm i && pnpm outdated"
alias whatsmyip='curl http://ipecho.net/plain; echo'
alias treesize='ncdu'
alias p="pnpm"
alias pc="pnpm check"
alias pd="pnpm dev"
alias pt="pnpm test"
alias ptw="pnpm test:watch"
alias ptu="pnpm test:update"
alias pl="pnpm lint"
alias ps="pnpm start"
alias pi="pnpm install"
alias pb="pnpm build"
alias po="pnpm outdated"
alias pu="pnpm update"

export no_proxy=".specific-domain.com,localhost"

function setProxy() {
  url="http://user1:pass2@proxy-web.specific-domain.com:8080"
  echo "Using proxy : ${url}"
  export http_proxy="${url}"
  export https_proxy="${http_proxy}"
  export ftp_proxy="${http_proxy}"
  export HTTP_PROXY="${http_proxy}"
  export HTTPS_PROXY="${https_proxy}"
  export FTP_PROXY="${ftp_proxy}"
}

if ! [[ "$PATH" =~ .npm-global/bin ]] && [ -d "$HOME/.npm-global/bin" ]; then PATH="$PATH:$HOME/.npm-global/bin"; elif [ -d "$HOME/.npm-global" ]; then PATH="$PATH:$HOME/.npm-global"; fi
if ! [[ "$PATH" =~ .local/share/applications ]] && [ -d "$HOME/.local/share/applications" ]; then PATH="$PATH:$HOME/.local/share/applications"; fi
if ! [[ "$PATH" =~ snippets/one-file ]] && [ -d "$HOME/Projects/github/snippets/one-file" ]; then PATH="$PATH:$HOME/Projects/github/snippets/one-file"; fi
if ! [[ "$PATH" =~ node-v20 ]] && [ -d "/d/Apps/NodeJs/node-v20.14.0-win-x64" ]; then PATH="$PATH:/d/Apps/NodeJs/node-v20.14.0-win-x64"; fi

echo Bash aliases loaded.
