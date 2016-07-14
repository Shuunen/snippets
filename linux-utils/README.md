
# Linux utils

If under Debian, do this as root :

````bash
apt-get install sudo
````

Add a user :

````bash
adduser MYUSER
usermod -a -G sudo MYUSER
usermod -a -G sshusers MYUSER (if needed)
````

Ìnstall git :

````bash
apt-get update
apt-get upgrade
apt-get install -y git
````

Logout from root & restart :

````bash
exit
shutdown -r now
````

Get snippets :

````bash
git clone https://github.com/Shuunen/snippets
cd snippets/linux-utils
./install.sh
````
