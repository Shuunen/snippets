#!/bin/bash

# Usage: chmod +x ./install.sh && ./install.sh

# prepare logfile
logfile=install.log
cat /dev/null > ${logfile}

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

# from https://stackoverflow.com/questions/4332478/read-the-current-text-color-in-a-xterm/4332530#4332530
RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
BLUE=$(tput setaf 153)
NORMAL=$(tput sgr0)

function consoleError {
    printf "\\nERROR : %s \\n" "${1}" >> ${logfile} 2>&1
    printf "%40s\\n  " "${RED}✘ ${1} ${NORMAL}" # print color then set it back to normal
}

function consoleLog {
    printf "\\nLOG : %s \\n" "${1}" >> ${logfile} 2>&1
    printf "%40s\\n  " "${BLUE}✔ ${1} ${NORMAL}" # print color then set it back to normal
}

function consoleSuccess {
    printf "\\nSUCCESS : %s \\n" "${1}" >> ${logfile} 2>&1
    printf "%40s\\n  " "${GREEN}✔ ${1} ${NORMAL}" # print color then set it back to normal
}

function install_if_needed {
    if not_installed "$1"; then
        sudo apt-get install "$1" -y | sudo tee -a ${logfile} > /dev/null
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
consoleLog "install or update custom ~/.mybashrc"
sudo cp .mybashrc ~/.mybashrc --force --verbose | sudo tee -a ${logfile} > /dev/null
# shellcheck source=/dev/null
source ~/.bashrc

# prepare auto source at login
if ! grep -i 'mybashrc' ~/.bashrc # not(grep --ignore-case "mystring" in/this/file)
then
    echo "source ~/.mybashrc" >> ~/.bashrc
    consoleSuccess "auto-source custom mybashrc at login"
else
    printf "\\n SUCCESS : mybashrc already auto-sourced in ~/.bashrc \\n" >> ${logfile} 2>&1
fi

# install custom utils, why not just add folder to PATH ?
consoleLog "install custom utils"
sudo cp -R mybins/* /usr/local/bin/ --force --verbose | sudo tee -a ${logfile} > /dev/null
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
sudo apt-get purge banshee brasero brasero-common brasero-cdrkit hexchat hexchat-common -y | sudo tee -a ${logfile} > /dev/null # audio + burner + chat
sudo apt-get purge mate-screensaver mate-screensaver-common xscreensaver-data-extra xscreensaver-data xscreensaver-gl-extra xscreensaver-gl -y | sudo tee -a ${logfile} > /dev/null # screensavers
sudo apt-get purge tomboy toshset brltty xplayer xplayer-common bluez-cups caja-folder-color-switcher -y | sudo tee -a ${logfile} > /dev/null # note + toshiba + braille display + player + bluetooth printers + custo
sudo apt-get purge ideviceinstaller xserver-xorg-input-wacom xserver-xorg-video-vmware  | sudo tee -a ${logfile} > /dev/null # apple device handler + tablet + vmware
sudo apt-get purge firefox thunderbird transmission pidgin gimp gimp-data -y | sudo tee -a ${logfile} > /dev/null # default mint/ubuntu programs
consoleLog "cleaned unused packages"

# system tweaks
if [[ ! -f ~/.lu-once ]]; then
    touch ~/.lu-once
    consoleSuccess "created ~/.lu-once to avoid applying systems tweaks more than once"

    sudo iw reg set FR
    consoleSuccess "wifi region settings set to EU"

    sudo sh -c "echo 'Dir::Cache \"\";\\nDir::Cache::archives \"\";' >> /etc/apt/apt.conf.d/02nocache"
    consoleSuccess "disabled apt local cache"

    sudo sh -c "echo '\\nHISTFILESIZE=10000\\nHISTSIZE=10000\\nHISTCONTROL=ignoredups' >> /etc/environment"
    consoleSuccess "allowed 10k entries in history instead of 500 by default"

    echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
    consoleSuccess "increased max number of inotify watches"

    consoleSuccess "system tweaks applied"
else
    consoleLog "system tweaks already applied"
fi

#  ██╗   ██╗██████╗ ██████╗  █████╗ ████████╗███████╗
#  ██║   ██║██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
#  ██║   ██║██████╔╝██║  ██║███████║   ██║   █████╗
#  ██║   ██║██╔═══╝ ██║  ██║██╔══██║   ██║   ██╔══╝
#  ╚██████╔╝██║     ██████╔╝██║  ██║   ██║   ███████╗
#   ╚═════╝ ╚═╝     ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

consoleLog "updating apt repositories..."
sudo apt-get update | sudo tee -a ${logfile} > /dev/null
consoleLog "update apt complete !"


#  ██╗███╗   ██╗███████╗████████╗ █████╗ ██╗     ██╗
#  ██║████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██║     ██║
#  ██║██╔██╗ ██║███████╗   ██║   ███████║██║     ██║
#  ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║     ██║
#  ██║██║ ╚████║███████║   ██║   ██║  ██║███████╗███████╗
#  ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝


install_if_needed "software-properties-common"  # packages needed to have "add-apt-repository" command
install_if_needed "lsb-release"     # lsb-release to show current system
install_if_needed "curl"            # to dl stuff
install_if_needed "build-essential" # to build stuff
install_if_needed "gcc"             # to build stuff (and needed for VBoxGuestAdditions)
install_if_needed "make"            # to build stuff (and needed for VBoxGuestAdditions)
install_if_needed "perl"            # to build stuff (and needed for VBoxGuestAdditions)
install_if_needed "nano"            # mini editor
install_if_needed "htop"            # better than top
install_if_needed "ncdu"            # browsable tree size
install_if_needed "pydf"            # show every disks sizes
install_if_needed "aria2"           # great downloader
install_if_needed "hdparm"          # good at measuring disk speed
install_if_needed "screenfetch"     # screenfetch is a kikoo login ascii art
install_if_needed "pm-utils"        # allow easy access to suspend, hibernate etc..
install_if_needed "git"             # really need a comment ?
install_if_needed "libssl-dev"      # pretty commom dev dep
install_if_needed "libcurl4-openssl-dev" # pretty commom dev dep

# great tool to record and share terminal sessions
# install_if_needed "asciinema"
# to start just run "asciinema rec", to finish hit Ctrl-D or type "exit"

# easy access/clean exif data on images
install_if_needed "libimage-exiftool-perl"
# To read  photo metadata : exiftool my_photo.jpg
# To clean photo metadata : exiftool -all= my_photo.jpg
# To clean all photos in a folder : exiftool -all= *.png

# de/compression libs
app="p7zip-full"
if not_installed ${app} ; then
    sudo apt-get install p7zip-rar p7zip-full unace unrar zip unzip sharutils rar uudeview mpack arj cabextract file-roller arj -y | sudo tee -a ${logfile} > /dev/null
    consoleSuccess "installed commons de/compression libs"
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
    consoleLog "optional : reload bash :)"
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
    sudo ufw enable | sudo tee -a ${logfile} > /dev/null # enable
    install_if_needed "gufw" # gui for UFW
else
    consoleLog "${app} was already installed"
fi

# microsoft fonts + unicode
app="ttf-dejavu"
if not_installed ${app} ; then
    sudo apt-get install ttf-ubuntu-font-family ttf-dejavu ttf-dejavu-extra ttf-liberation ttf-ancient-fonts -y | sudo tee -a ${logfile} > /dev/null
    consoleSuccess "installed extra fonts"
    sudo fc-cache -f -v | sudo tee -a ${logfile} > /dev/null
    consoleSuccess "cleared & reloaded font cache"
else
    consoleLog "extra fonts was already installed"
fi

# for eye care, try `gtk-redshift -l 45.45:3.07` to conf
install_if_needed "redshift"
install_if_needed "gtk-redshift"

# to read dvd (commented because not using that much)
#app="libdvdcss2"
#if not_installed ${app} ; then
#    sudo gdebi --non-interactive --quiet saveddeb/libdvdcss2_*.deb >> ${logfile} 2>&1 # simple library designed for accessing DVDs
#    check_install ${app}
#else
#    consoleLog "${app} was already installed"
#fi
#install_if_needed "libdvdnav4"

# great app/file launcher like launchy
sudo gdebi --non-interactive --quiet saveddeb/ulauncher_*.deb | sudo tee -a ${logfile} > /dev/null
consoleLog "uLauncher installed or updated"

# clean apt packages
sudo apt-get autoremove -y | sudo tee -a ${logfile} > /dev/null

app="ttf-mscorefonts-installer"
if not_installed ${app} ; then
    consoleLog "optional : you can manually run 'install ttf-mscorefonts-installer' & 'sudo fc-cache -f -v' to get win fonts & clear font cache"
fi

# TODO : Dependency is not satisfiable: libwxbase2.8-0
# sudo gdebi --non-interactive --quiet saveddeb/woeusb_3.1.4-1_webupd8_trusty0_amd64.deb # create bootable windows installer on usb

# reload bash
consoleLog "optional : reload bash :)"
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
