#!/bin/bash

eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa_gh
ssh-add ~/.ssh/id_rsa_anatec

alias ll="ls -alhFo --group-directories-first --time-style=long-iso --color=auto"
alias regenLock="rm node_modules/ -rf && rm pnpm-lock.yaml && pnpm i && pnpm outdated"

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

echo ""
test -f ~/fetch-once.log && cat ~/fetch-once.log 
echo "Welcome ${USERNAME} ^^"
