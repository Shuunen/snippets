#!/bin/bash

# prepare logfile
logfile=get.log
cat /dev/null > ${logfile}

# git is mandatory to be able to clone
sudo apt-get install git -y | sudo tee -a ${logfile} > /dev/null

# delete existing folder is exists
rm -rf ./snippets >> ${logfile} 2>&1

# clone repo
git clone https://github.com/Shuunen/snippets >> ${logfile} 2>&1

# go into dir
cd snippets/linux-utils || return

# make script executable
sudo chmod +x ./install.sh

# start
./install.sh

# exit folder
cd ../.. || return
