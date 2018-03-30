#!/bin/bash

# prepare logfile
logfile=get.log
cat /dev/null > ${logfile}

# import common functions
source ./common.sh

# git is mandatory to be able to clone
install_if_needed "git"

# clone repo
git clone https://github.com/Shuunen/snippets

# go to linux folder
cd snippets/linux-utils

# make script executable
sudo chmod +x install.sh

# start
./install.sh