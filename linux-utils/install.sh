#!/bin/bash
#
# Usage: chmod +x ./install.sh && ./install.sh

reset

#  ███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
#  ██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
#  █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
#  ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
#  ██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
#  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
                                                                                                                                                    
function not_installed {
    # set to 1 initially
    local return_=1
    # set to 0 if not found
    # type $1 >/dev/null 2>&1 || { local return_=0; }
    dpkg -s "$1" >/dev/null 2>&1 || { local return_=0; }
    # return value
    return "$return_"
}

function check_install {
    if not_installed $1 ; then    
        echo_fail $1
    else
        echo_pass $1
    fi
}

function echo_fail {
    # echo first argument in red
    printf "\n \e[31m✘ ${1} has not been installed"
    # reset colours back to normal
    echo -e "\033[0m"
}

function echo_pass {
    # echo first argument in green
    printf "\n  \e[32m✔ ${1} has been installed"
    # reset colours back to normal
    echo -e "\033[0m"
}

function echo_good {
    # echo first argument in blue
    printf "\n  \e[34m✔ ${1} was already installed"
    # reset colours back to normal
    echo -e "\033[0m"
}

function install_if_needed {
    if not_installed $1 ; then
        sudo apt-get install $1 -y
        check_install $1
    else
        echo_good $1
    fi
}

function is_desktop {
     # set to 1 initially
    local return_=0
    # set to 0 if not found
    dpkg -l ubuntu-desktop | grep 'desktop system' >/dev/null 2>&1 || { local return_=1; }
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
    echo "  create bashrc file"
    touch ~/.bashrc
fi

# install custom bashrc
if [[ -z $(grep ". ~/.mybashrc" ~/.bashrc) ]]; then              
    echo "source ~/.mybashrc" >> ~/.bashrc
    echo "  auto-source custom bashrc..."
fi	
echo "  install custom bashrc..."
sudo cp .mybashrc ~/.mybashrc --force --verbose
source ~/.bashrc

# install custom utils
echo "  install custom utils..."
sudo cp -R mybins/* /usr/local/bin/ --force --verbose
sudo chmod +x /usr/local/bin/*
	



#  ██████╗ ███████╗███╗   ███╗ ██████╗ ██╗   ██╗███████╗     ██████╗██████╗  █████╗ ██████╗ 
#  ██╔══██╗██╔════╝████╗ ████║██╔═══██╗██║   ██║██╔════╝    ██╔════╝██╔══██╗██╔══██╗██╔══██╗
#  ██████╔╝█████╗  ██╔████╔██║██║   ██║██║   ██║█████╗      ██║     ██████╔╝███████║██████╔╝
#  ██╔══██╗██╔══╝  ██║╚██╔╝██║██║   ██║╚██╗ ██╔╝██╔══╝      ██║     ██╔══██╗██╔══██║██╔═══╝ 
#  ██║  ██║███████╗██║ ╚═╝ ██║╚██████╔╝ ╚████╔╝ ███████╗    ╚██████╗██║  ██║██║  ██║██║     
#  ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     

if is_desktop ; then

    # remove useless stuff
    sudo apt-get -qq remove thunderbir* firefo* gnome-conta* libreoffice* xul-ext-ubufo* xul-ext-uni* xul-ext-webaccoun* transmission-gt* unity-scope-gdriv* brasero-cd* rhythmbo* landscape-clien* unity-webapps-commo*

fi



#   █████╗ ██████╗ ██████╗     ██████╗ ███████╗██████╗  ██████╗ ███████╗
#  ██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔════╝
#  ███████║██║  ██║██║  ██║    ██████╔╝█████╗  ██████╔╝██║   ██║███████╗
#  ██╔══██║██║  ██║██║  ██║    ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║╚════██║
#  ██║  ██║██████╔╝██████╔╝    ██║  ██║███████╗██║     ╚██████╔╝███████║
#  ╚═╝  ╚═╝╚═════╝ ╚═════╝     ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚══════╝

if is_desktop ; then

    # flux for eye care
    if [[ ! -f /etc/apt/sources.list.d/kilian-f_lux-trusty.list ]]; then
        echo "  install ppa:kilian/f.lux..."
        sudo add-apt-repository ppa:kilian/f.lux -y
    fi
    
    # H.265 / HEVC codec
    if [[ ! -f /etc/apt/sources.list.d/strukturag-libde265-trusty.list ]]; then
        echo "  install ppa:strukturag/libde265..."
        sudo apt-add-repository ppa:strukturag/libde265 -y
    fi
fi



#  ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
#  ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
#  ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗  
#  ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝  
#  ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗
#   ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

sudo apt-get -qq update




#  ██╗███╗   ██╗███████╗████████╗ █████╗ ██╗     ██╗     
#  ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██║     ██║     
#  ██║██╔██╗ ██║███████╗   ██║   ███████║██║     ██║     
#  ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║     ██║     
#  ██║██║ ╚████║███████║   ██║   ██║  ██║███████╗███████╗
#  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝

# mini editor
install_if_needed "nano"

# better than top
install_if_needed "htop"

# TODO : describe
install_if_needed "ncdu"

# TODO : describe
install_if_needed "pydf"

# git
app="git"
if not_installed $app ; then
    sudo apt-get install git -y
    git config --global push.default simple
    git config --global credential.helper cache
    git config --global credential.helper 'cache --timeout=360000'
    check_install $app
else
    echo_good $app
fi

# nvm, node & npm
app="nvm"
path="$NVM_DIR"
pathsize=$(echo ${#path})
if [ $pathsize -gt 1 ] ; then
    echo_good $app
else
    sudo apt-get install build-essential libssl-dev -y
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.29.0/install.sh | bash
    source ~/.profile
    nvm ls-remote # list availables version downloadable
    nvm install node # install more recent
    nvm use node # use it
    echo "nvm use node" >> ~/.bashrc # use it at each login
    nvm ls # list availables version locally installed
    node -v # show node version
    npm -v # show npm version
    
    path="$NVM_DIR"
    pathsize=$(echo ${#path})
    if [ $pathsize -gt 1 ] ; then
        echo_pass $app
    else
        echo_fail $app
    fi
fi



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
install_if_needed "nautilus-open-terminal"

# gedit complete
install_if_needed "gedit"
install_if_needed "gedit-developer-plugins"
install_if_needed "gedit-plugins"
install_if_needed "gedit-source-code-browser-plugin"

# handy debian conf
install_if_needed "dconf-editor"

# flux for eye care
install_if_needed "fluxgui"

# vlc
install_if_needed "vlc"
install_if_needed "vlc-plugin-libde265"

# partition manager
install_if_needed "gparted"

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

