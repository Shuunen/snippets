#!/bin/bash
#
# Usage: chmod +x ./ubuntu-graphical.sh && ./ubuntu-graphical.sh

##################
# 1. Add repos  ##
##################

# flux for eye care
sudo add-apt-repository ppa:kilian/f.lux -y

##################
# 2. Update     ##
##################
sudo apt-get update

##################
# 3. Install    ##
##################

# nautilus plugins
sudo apt-get install nautilus-open-terminal -y

# gedit complete
sudo apt-get install gedit gedit-developer-plugins gedit-plugins gedit-source-code-browser-plugin -y

# handy debian conf
sudo apt-get install dconf-editor -y

# flux for eye care
sudo apt-get install fluxgui -y

# vlc
sudo apt-get install vlc -y
