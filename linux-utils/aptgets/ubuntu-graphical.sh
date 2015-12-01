#!/bin/bash
#
# Usage: chmod +x ./ubuntu-graphical.sh && ./ubuntu-graphical.sh

# nautilus plugins
sudo apt-get install nautilus-open-terminal -y

# gedit complete
sudo apt-get install gedit gedit-developer-plugins gedit-plugins gedit-source-code-browser-plugin -y

# handy debian conf
sudo apt-get install dconf-editor -y
