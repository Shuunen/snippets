#!/bin/bash
#
# Usage: chmod +x ./install.sh && ./install.sh

# Stops execution if any command fails.
set -eo pipefail


main() {
    
    # 1. Creates ~/.bashrc if it doesn't exist.
    if [[ ! -f ~/.bashrc ]]; then
        touch ~/.bashrc
    fi

    # 2. Install custom bashrc
    if [[ -z $(grep ". ~/.mybashrc" ~/.bashrc) ]]; then              
        echo "source ~/.mybashrc" >> ~/.bashrc     
        echo "PROJECTS_DIR=/media/romain/BigStock/_Devellopement/Projects/" >> ~/.bashrc
    fi	
    echo "install custom bashrc..."
    sudo cp .mybashrc ~/.mybashrc --force --verbose
    source ~/.bashrc

    # 3. Install custom utils
	echo "install custom utils..."
	sudo cp -R mybins/* /usr/local/bin/ --force --verbose
	sudo chmod +x /usr/local/bin/*
}

main "$@"
