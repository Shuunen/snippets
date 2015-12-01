#!/bin/bash
#
# Usage: chmod +x ./ubuntu.sh && ./ubuntu.sh
sudo apt-get install nano htop ncdu pydf -y

sudo apt-get install git -y
git config --global user.email "romain.racamier@gmail.com"
git config --global user.name "Romain Racamier Lafon"
git config --global push.default simple
git config --global credential.helper cache
