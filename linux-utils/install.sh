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
    packages=("ubuntu-desktop" "mate-desktop" "xubuntu-desktop" "elementary-desktop" "cinnamon-desktop-data" "gnome-desktop3-data")
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

# install custom utils, why not just add folder to PATH ?
consoleLog "install custom utils"
sudo cp -R mybins/* /usr/local/bin/ --force --verbose >> ${logfile} 2>&1
sudo chmod +x /usr/local/bin/*

# remove useless aptitude translations
# file="/etc/apt/apt.conf.d/99translations"
# if [[ ! -f "$file" ]]; then
#     consoleSuccess "remove useless aptitude translations"
#     sudo touch "$file"
#     echo 'Acquire::Languages "none";' | sudo tee -a ${file} >> ${logfile} 2>&1 # allow to append line to a root file
#     sudo rm -r /var/lib/apt/lists/*Translation* >> ${logfile} 2>&1
# fi

# clean shit
sudo apt purge banshee brasero brasero-common brasero-cdrkit hexchat hexchat-common -y >> ${logfile} 2>&1 # audio + burner + chat
sudo apt purge mate-screensaver mate-screensaver-common xscreensaver-data-extra xscreensaver-data xscreensaver-gl-extra xscreensaver-gl -y >> ${logfile} 2>&1 # screensavers
sudo apt purge tomboy toshset brltty xplayer xplayer-common bluez-cups caja-folder-color-switcher -y >> ${logfile} 2>&1 # note + toshiba + braille display + player + bluetooth printers + custo
sudo apt purge ideviceinstaller xserver-xorg-input-wacom xserver-xorg-video-vmware firefox* transmission* -y >> ${logfile} 2>&1 # apple device handler + tablet + vmware

# show env detected
if is_desktop ; then
    consoleLog "desktop detected"
else
    consoleLog "headless server detected"    
fi


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


# packages needed to have "add-apt-repository" command
install_if_needed "software-properties-common"

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

# great tool to record and share terminal sessions 
# install_if_needed "asciinema"
# to start just run "asciinema rec", to finish hit Ctrl-D or type "exit"

# easy access/clean exif data on images
install_if_needed "libimage-exiftool-perl"
# To read  photo metadata : exiftool my_photo.jpg
# To clean photo metadata : exiftool -all= my_photo.jpg
# To clean all photos in a folder : exiftool -all= *.png

# git
install_if_needed "git"

# de/compression libs
app="p7zip-full"
if not_installed ${app} ; then
    sudo apt install p7zip-rar p7zip-full unace unrar zip unzip sharutils rar uudeview mpack arj cabextract file-roller arj -y >> ${logfile} 2>&1
    consoleSuccess "installed de/compression libs"
else
    consoleLog "de/compression libs was already installed"
fi

# Node Version Manager - Simple bash script to manage multiple active node.js versions
if [[ ! -d ~/.nvm ]]; then
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.6/install.sh | bash >> ${logfile} 2>&1
else
    consoleLog "Node Version Manager was already installed"
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

install_if_needed "gedit"        # gedit complete
install_if_needed "gedit-developer-plugins"
install_if_needed "gedit-plugins"
install_if_needed "dconf-editor" # handy debian conf
install_if_needed "apturl"       # allow to install packets via apt://stuff
install_if_needed "flashplugin-installer"
install_if_needed "vlc"
install_if_needed "gdebi"
install_if_needed "pinta"        # nice graphic editor like Paint.net
install_if_needed "livestreamer" # allow stream playing into vlc
install_if_needed "gparted"      # partition manager
install_if_needed "meld"         # to compare files & dir
install_if_needed "xsel"         # allow getting and setting clipboard
install_if_needed "shotwell"     # digital photo organizer/viewer
install_if_needed "chromium-browser" # as good as chrome but without spywares # else try "chromium-browser-l10n"
# Peek                           # animated GIF screen recorder https://github.com/phw/peek/releases
# Vectr                          # great SVG Editor https://vectr.com/downloads/
# qbittorrent                    # great bt client

# Unix FireWall
app="gufw"
if not_installed ${app} ; then
    sudo ufw enable >> ${logfile} 2>&1 # enable
    install_if_needed "gufw"         # gui for UFW
else
    consoleLog "${app} was already installed"
fi

# microsoft fonts + unicode
app="ttf-dejavu"
if not_installed ${app} ; then
    sudo apt install ttf-ubuntu-font-family ttf-dejavu ttf-dejavu-extra ttf-liberation ttf-ancient-fonts -y >> ${logfile} 2>&1
    consoleSuccess "installed extra fonts"
else
    consoleLog "extra fonts was already installed"
fi

# for eye care, try `gtk-redshift -l 45.45:3.07` to conf
install_if_needed "redshift"
install_if_needed "gtk-redshift"

# to read dvd
app="libdvdcss2"
if not_installed ${app} ; then
    sudo gdebi --non-interactive --quiet saveddeb/libdvdcss2_1.2.13-0_amd64.deb # simple library designed for accessing DVDs
    check_install ${app}
else
    consoleLog "${app} was already installed"
fi
install_if_needed "libdvdnav4"

app="ulauncher"
if not_installed ${app} ; then
    sudo gdebi --non-interactive --quiet saveddeb/ulauncher_3.2.1.r1_all.deb    # great app/file launcher like launchy
    check_install ${app}
else
    consoleLog "${app} was already installed"
fi

# TODO : Dependency is not satisfiable: libwxbase2.8-0
# sudo gdebi --non-interactive --quiet saveddeb/woeusb_3.1.4-1_webupd8_trusty0_amd64.deb # create bootable windows installer on usb

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

# For ideas & tweaks
# https://lehollandaisvolant.net/linux/checklist/
# http://www.noobslab.com/2013/10/tweaksthings-to-do-after-install-of.html


#  ████████╗██╗  ██╗███████╗    ███████╗███╗   ██╗██████╗ 
#  ╚══██╔══╝██║  ██║██╔════╝    ██╔════╝████╗  ██║██╔══██╗
#     ██║   ███████║█████╗      █████╗  ██╔██╗ ██║██║  ██║
#     ██║   ██╔══██║██╔══╝      ██╔══╝  ██║╚██╗██║██║  ██║
#     ██║   ██║  ██║███████╗    ███████╗██║ ╚████║██████╔╝
#     ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚══════╝╚═╝  ╚═══╝╚═════╝ 
# 
