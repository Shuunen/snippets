#!/bin/bash

eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa_gh

alias ll="ls -alhFo --group-directories-first --time-style=long-iso --color=auto"
