#!/bin/bash
#
# Usage: chmod +x ./ubuntu.sh && ./ubuntu.sh

# remove useless stuff
sudo apt-get remove thunderbir* firefo* gnome-conta* libreoffice* xul-ext-ubufo* xul-ext-uni* xul-ext-webaccoun* transmission-gt* unity-scope-gdriv* brasero-cd* rhythmbo* landscape-clien* unity-webapps-commo*

# mini softs
sudo apt-get install nano htop ncdu pydf -y

# git
sudo apt-get install git -y
git config --global user.email "romain.racamier@gmail.com"
git config --global user.name "Romain Racamier Lafon"
git config --global push.default simple
git config --global credential.helper cache
git config --global credential.helper 'cache --timeout=360000'
