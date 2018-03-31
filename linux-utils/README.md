
# Linux customization

Personal Linux headless & desktop customization :sparkles:

## Use

If you don't have sudo, look below, else just execute this where you want the repo to be cloned into :

````bash
curl http://git.io/shuu-linux | bash
````

:penguin: Please do not trust any script & look the sources before executing stuff like this on your computer :penguin:


### Sudo
Do this is as root :

````bash
apt-get install sudo
````

Add a user :

````bash
adduser MYUSER
usermod -a -G sudo MYUSER
usermod -a -G sshusers MYUSER (if needed)
````

Logout from root & restart :

````bash
exit
shutdown -r now
````

