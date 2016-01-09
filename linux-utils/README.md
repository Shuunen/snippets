
# Linux utils

If under Debian, do this as root :

````bash
apt-get install sudo
````

Add a user :

````bash
adduser MYUSER
usermod -a -G sudo MYUSER
````

Ìnstall git :

````bash
apt-get update
apt-get upgrade
apt-get install -y git
````

Logout from root :

````bash
exit
````

Get snippets :

````bash
git clone https://github.com/Shuunen/snippets
cd snippets/linux-utils
./install.sh
````
