#!/bin/bash

function log {
	printf "\\n✔ : %s \\n" "${1}"
}

function init {
	log "script starting..."

	log "installing/checking git"
	sudo apt-get install git -y

	log "delete snippets existing folder is exists"
	rm -rf ./snippets

	log "clone snippets repo"
	git clone https://github.com/Shuunen/snippets

	log "go into snippets linux-utils folder"
	cd snippets/linux-utils || return

	log "make script executable"
	sudo chmod +x ./install.sh

	log "start install script"
	./install.sh

	log "exit folder"
	cd ../.. || return

	log "delete snippets folder (leave log files if needed)"
	rm -rf ./snippets

	log "script finnished :)"
}

init 2>&1 | tee get.log
