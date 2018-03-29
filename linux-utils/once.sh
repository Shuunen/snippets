#!/bin/bash
#
# Usage: chmod +x ./once.sh && ./once.sh

# prepare logfile
logfile=once.log
cat /dev/null > ${logfile}

# clean console
reset

#  ███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
#  ██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
#  █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
#  ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
#  ██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
#  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
                                                                                                                                                    
function consoleError {
    printf "\n  \e[31m✘ ${1}" # echo first argument in red   
    echo -e "\033[0m" # reset colours back to normal
}

function consoleLog {    
    printf "\n  \e[34m✔ ${1}" # echo first argument in blue
    echo -e "\033[0m" # reset colours back to normal
}

function consoleSuccess {
    printf "\n  \e[32m✔ ${1}" # echo first argument in green
    echo -e "\033[0m" # reset colours back to normal
}

#   ██████╗██╗   ██╗███████╗████████╗ ██████╗ ███╗   ███╗██╗███████╗███████╗
#  ██╔════╝██║   ██║██╔════╝╚══██╔══╝██╔═══██╗████╗ ████║██║╚══███╔╝██╔════╝
#  ██║     ██║   ██║███████╗   ██║   ██║   ██║██╔████╔██║██║  ███╔╝ █████╗  
#  ██║     ██║   ██║╚════██║   ██║   ██║   ██║██║╚██╔╝██║██║ ███╔╝  ██╔══╝  
#  ╚██████╗╚██████╔╝███████║   ██║   ╚██████╔╝██║ ╚═╝ ██║██║███████╗███████╗
#   ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝


printf "This script should only be run once..."
read -p "Press enter to continue"

sudo iw reg set FR
consoleSuccess "EU wifi settings set"

sudo sh -c "echo 'Dir::Cache \"\";\nDir::Cache::archives \"\";' >> /etc/apt/apt.conf.d/02nocache"
consoleSuccess "disabled apt local cache"

sudo sh -c "echo '\nHISTFILESIZE=10000\nHISTSIZE=10000\nHISTCONTROL=ignoredups' >> /etc/environment"
consoleSuccess "allowed 10k entries in history instead of 500 by default"

sudo fc-cache -f -v
consoleSuccess "cleared & reloaded font cache"

consoleLog "if you use gnome desktop execute next line"
consoleLog "gsettings set org.gnome.desktop.wm.preferences button-layout ':minimize,maximize,close'"

consoleLog "you need to manually run 'install ttf-mscorefonts-installer' to get win fonts"
