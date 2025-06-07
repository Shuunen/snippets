#!/bin/bash

# Helper function to detect package manager
pkgm() {
  if [ -f "bun.lock" ] || [ -f "bun.lockb" ]; then
    echo "bun"
  elif [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  else
    echo "npm"
  fi
}

alias ..='cd ..' 
alias ll="ls -lv --almost-all --no-group --human-readable --classify --group-directories-first --time-style=long-iso --color=auto"
alias merge=meld 
alias mkdir='mkdir -pv' 
alias psg='ps aux | grep -v grep | grep -i -e VSZ -e'

# Improved regenLock to handle bun, pnpm, and npm
regenLock() {
  rm -rf node_modules/
  if [ -f "bun.lock" ] || [ -f "bun.lockb" ]; then
    rm -f bun.lock bun.lockb
    bun install
    bun outdated
  elif [ -f "pnpm-lock.yaml" ]; then
    rm -f pnpm-lock.yaml
    pnpm install
    pnpm outdated
  else
    rm -f package-lock.json
    npm install
    npm outdated
  fi
}
alias regenLock=regenLock

alias updateLock='$(pkgm) update && git checkout package.json && $(pkgm) install && $(pkgm) outdated'
alias whatsmyip='curl http://ipecho.net/plain; echo'
alias treesize='ncdu'
alias p='$(pkgm)'
alias pp='echo && echo "Using $(pkgm) $($(pkgm) --version) 🚀" && echo'
alias pc='$(pkgm) check'
alias pd='$(pkgm) dev'
alias pt='$(pkgm) run test'
alias ptw='$(pkgm) test:watch'
alias ptu='$(pkgm) test:update'
alias pl='$(pkgm) lint'
alias ps='$(pkgm) start'
alias pi='$(pkgm) install'
alias pb='$(pkgm) run build'
alias po='$(pkgm) outdated'
alias pu='$(pkgm) update'
alias pv='$(pkgm) validate'

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
if ! [[ "$PATH" =~ Node_22_Final ]] && [ -d "/d/Apps/Node_22_Final" ]; then PATH="$PATH:/d/Apps/Node_22_Final"; fi

echo Bash aliases v1 loaded 🧭
