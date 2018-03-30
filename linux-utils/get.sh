#!/bin/bash

# prepare logfile
logfile=get.log
cat /dev/null > ${logfile}

# git is mandatory to be able to clone
sudo apt install git -y >> ${logfile} 2>&1

# clone repo
git clone https://github.com/Shuunen/snippets >> ${logfile} 2>&1

# go to linux folder
cd snippets/linux-utils

# make script executable
sudo chmod +x install.sh

# start
./install.sh