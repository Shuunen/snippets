#!/bin/bash

# Usage: source ./common.sh

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
    echo "\n ERROR : ${1} \n" >> ${logfile} 2>&1
    printf "\n  \e[31m✘ ${1}" # echo first argument in red   
    echo -e "\033[0m" # reset colours back to normal
}

function consoleLog {    
    echo "\n LOG : ${1} \n" >> ${logfile} 2>&1
    printf "\n  \e[34m✔ ${1}" # echo first argument in blue
    echo -e "\033[0m" # reset colours back to normal
}

function consoleSuccess {
    echo "\n SUCCESS : ${1} \n" >> ${logfile} 2>&1
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
