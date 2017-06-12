#!/bin/bash
#
# Usage: chmod +x ./install.sh && ./install.sh

# prepare logfile
logfile=install.log
cat /dev/null > ${logfile}

# clean console
reset

#  ███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
#  ██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
#  █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
#  ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
#  ██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
#  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
                                                                                                                                                    
function not_installed {
    # set to 1 (false) initially
    local return_=1
    # set to 0 (true) if not found
    # type $1 >/dev/null 2>&1 || { local return_=0; }
    dpkg -s "$1" >/dev/null 2>&1 || { local return_=0; }
    # return value
    return "$return_"
}

function check_install {
    if not_installed "$1" ; then    
        consoleError "$1 has not been installed"
    else
        consoleSuccess "$1 has been installed"
    fi
}

function consoleError {
    printf "\n \e[31m✘ ${1}" # echo first argument in red   
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

function install_if_needed {
    if not_installed "$1"; then
        sudo apt install "$1" -y >> ${logfile} 2>&1
        check_install "$1"
    else
        consoleLog "$1 was already installed"
    fi
}

function is_desktop {
    # set to 1 (false) initially
    local return_=1
    # array of desktop packages 
    packages=("ubuntu-desktop" "mate-desktop")
    # check for one of them
    for package in "${packages[@]}"; do
        if not_installed "$package" ; then
            consoleLog "dektop package \"$package\" not detected"
        else
            consoleSuccess "dektop package \"$package\" detected"
            # found ! set to 0 (true)
            local return_=0
            # stop iterations
            break
        fi
    done 
    # return value
    return "$return_"
}



#   ██████╗██╗   ██╗███████╗████████╗ ██████╗ ███╗   ███╗██╗███████╗███████╗
#  ██╔════╝██║   ██║██╔════╝╚══██╔══╝██╔═══██╗████╗ ████║██║╚══███╔╝██╔════╝
#  ██║     ██║   ██║███████╗   ██║   ██║   ██║██╔████╔██║██║  ███╔╝ █████╗  
#  ██║     ██║   ██║╚════██║   ██║   ██║   ██║██║╚██╔╝██║██║ ███╔╝  ██╔══╝  
#  ╚██████╗╚██████╔╝███████║   ██║   ╚██████╔╝██║ ╚═╝ ██║██║███████╗███████╗
#   ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝



# creates ~/.bashrc if it doesn't exist.
if [[ ! -f ~/.bashrc ]]; then
    consoleSuccess "create .bashrc file because none was found"
    touch ~/.bashrc
fi

# install custom mybashrc
consoleLog "install custom ~/.mybashrc"
sudo cp .mybashrc ~/.mybashrc --force --verbose >> ${logfile} 2>&1
source ~/.bashrc

# prepare auto source at login
if [[ -z $(grep ". ~/.mybashrc" ~/.bashrc) ]]; then    
    echo "source ~/.mybashrc" >> ~/.bashrc
    consoleSuccess "auto-source custom mybashrc at login"
fi

# install custom utils
consoleLog "install custom utils"
sudo cp -R mybins/* /usr/local/bin/ --force --verbose >> ${logfile} 2>&1
sudo chmod +x /usr/local/bin/*

# remove useless aptitude translations
file="/etc/apt/apt.conf.d/99translations"
if [[ ! -f "$file" ]]; then
    consoleSuccess "remove useless aptitude translations"
    sudo touch "$file"
    echo 'Acquire::Languages "none";' | sudo tee -a ${file} >> ${logfile} 2>&1 # allow to append line to a root file
    sudo rm -r /var/lib/apt/lists/*Translation* >> ${logfile} 2>&1
fi


#  ██████╗ ███████╗███╗   ███╗ ██████╗ ██╗   ██╗███████╗     ██████╗██████╗  █████╗ ██████╗ 
#  ██╔══██╗██╔════╝████╗ ████║██╔═══██╗██║   ██║██╔════╝    ██╔════╝██╔══██╗██╔══██╗██╔══██╗
#  ██████╔╝█████╗  ██╔████╔██║██║   ██║██║   ██║█████╗      ██║     ██████╔╝███████║██████╔╝
#  ██╔══██╗██╔══╝  ██║╚██╔╝██║██║   ██║╚██╗ ██╔╝██╔══╝      ██║     ██╔══██╗██╔══██║██╔═══╝ 
#  ██║  ██║███████╗██║ ╚═╝ ██║╚██████╔╝ ╚████╔╝ ███████╗    ╚██████╗██║  ██║██║  ██║██║     
#  ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     

if is_desktop ; then
    consoleLog "desktop detected"
    # remove useless stuff
    sudo apt remove -y thunderbir* >> ${logfile} 2>&1
else
    consoleLog "headless server detected"    
fi



#   █████╗ ██████╗ ██████╗     ██████╗ ███████╗██████╗  ██████╗ ███████╗
#  ██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔════╝
#  ███████║██║  ██║██║  ██║    ██████╔╝█████╗  ██████╔╝██║   ██║███████╗
#  ██╔══██║██║  ██║██║  ██║    ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║╚════██║
#  ██║  ██║██████╔╝██████╔╝    ██║  ██║███████╗██║     ╚██████╔╝███████║
#  ╚═╝  ╚═╝╚═════╝ ╚═════╝     ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚══════╝


# packages needed to have "add-apt-repository" command
install_if_needed "software-properties-common"

# if is_desktop ; then

    # app="seafile-gui"
    # if not_installed ${app} ; then
    #     consoleSuccess "installing repo for ${app}"
    #     sudo apt-add-repository 'deb http://ppa.launchpad.net/m.eik/seafile/ubuntu trusty main' -y >> ${logfile} 2>&1
    # fi

    # app="gedit-developer-plugins"
    # if not_installed ${app} ; then
    #     consoleSuccess "installing repo for ${app}"
    #     sudo add-apt-repository ppa:sinzui/ppa -y >> ${logfile} 2>&1
    # fi
     
    # app="fluxgui"
    # if not_installed ${app} ; then
    #     consoleSuccess "installing repo for ${app}"
    #     sudo add-apt-repository ppa:nathan-renniewaldock/flux -y >> ${logfile} 2>&1
    # fi

# fi


#  ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
#  ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
#  ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗  
#  ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝  
#  ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗
#   ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

consoleLog "updating apt repositories..."
sudo apt update >> ${logfile} 2>&1
consoleLog "update apt complete !"



#  ██╗███╗   ██╗███████╗████████╗ █████╗ ██╗     ██╗     
#  ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██║     ██║     
#  ██║██╔██╗ ██║███████╗   ██║   ███████║██║     ██║     
#  ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║     ██║     
#  ██║██║ ╚████║███████║   ██║   ██║  ██║███████╗███████╗
#  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝

# lsb-release to show current system
install_if_needed "lsb-release"

# to dl stuff
install_if_needed "curl"

# to build stuff
install_if_needed "build-essential"

# mini editor
install_if_needed "nano"

# better than top
install_if_needed "htop"

# tree size browsable
install_if_needed "ncdu"

# show every disks sizes
install_if_needed "pydf"

# great downloader
install_if_needed "aria2"

# good for measuring disk speed
install_if_needed "hdparm"

# screenfetch is a kikoo login ascii art
install_if_needed "screenfetch"

# allow easy access to suspend, hibernate etc..
install_if_needed "pm-utils"

# allow stream playing into vlc
install_if_needed "livestreamer"

# git
app="git"
if not_installed ${app} ; then
    sudo apt install git -y >> ${logfile} 2>&1
    git config --global push.default simple
    git config --global credential.helper cache
    git config --global credential.helper 'cache --timeout=360000'
    check_install ${app}
else
    consoleLog "${app} was already installed"
fi

# nvm, node & npm
#app="nvm"

#  ██████╗ ███████╗███████╗██╗  ██╗████████╗ ██████╗ ██████╗ 
#  ██╔══██╗██╔════╝██╔════╝██║ ██╔╝╚══██╔══╝██╔═══██╗██╔══██╗
#  ██║  ██║█████╗  ███████╗█████╔╝    ██║   ██║   ██║██████╔╝
#  ██║  ██║██╔══╝  ╚════██║██╔═██╗    ██║   ██║   ██║██╔═══╝ 
#  ██████╔╝███████╗███████║██║  ██╗   ██║   ╚██████╔╝██║     
#  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝     

if ! is_desktop ; then
    bash
    exit 1;
fi

# nautilus plugins
# install_if_needed "nautilus-open-terminal"

# gedit complete
install_if_needed "gedit"
install_if_needed "gedit-developer-plugins"
install_if_needed "gedit-plugins"
install_if_needed "gedit-source-code-browser-plugin"

# handy debian conf
install_if_needed "dconf-editor"

# vlc
install_if_needed "vlc"

# partition manager
install_if_needed "gparted"

# to compare files & dir
install_if_needed "meld"

# allow getting and setting clipboard
install_if_needed "xsel"

# seafile
# install_if_needed "seafile-gui"

# flux
# install_if_needed "fluxgui"

# reload bash
bash
exit 1;

#  ████████╗██╗  ██╗ █████╗ ███╗   ██╗██╗  ██╗███████╗
#  ╚══██╔══╝██║  ██║██╔══██╗████╗  ██║██║ ██╔╝██╔════╝
#     ██║   ███████║███████║██╔██╗ ██║█████╔╝ ███████╗
#     ██║   ██╔══██║██╔══██║██║╚██╗██║██╔═██╗ ╚════██║
#     ██║   ██║  ██║██║  ██║██║ ╚████║██║  ██╗███████║
#     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝

# For ascii art                                                     
# http://patorjk.com/software/taag/#p=display&h=0&v=0&c=bash&f=ANSI%20Shadow&t=THANKS

# For functions
# https://gist.github.com/JamieMason/4761049   
# http://askubuntu.com/questions/12562/how-to-check-if-ubuntu-desktop-or-server-is-installed#12571

# For custom bashrc 
# https://github.com/gto76/standard-aliases


#  ████████╗██╗  ██╗███████╗    ███████╗███╗   ██╗██████╗ 
#  ╚══██╔══╝██║  ██║██╔════╝    ██╔════╝████╗  ██║██╔══██╗
#     ██║   ███████║█████╗      █████╗  ██╔██╗ ██║██║  ██║
#     ██║   ██╔══██║██╔══╝      ██╔══╝  ██║╚██╗██║██║  ██║
#     ██║   ██║  ██║███████╗    ███████╗██║ ╚████║██████╔╝
#     ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚══════╝╚═╝  ╚═══╝╚═════╝ 
# 
