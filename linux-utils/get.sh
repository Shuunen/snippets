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

# make script executable
sudo chmod +x snippets/linux-utils/install.sh

# start
./snippets/linux-utils/install.sh
