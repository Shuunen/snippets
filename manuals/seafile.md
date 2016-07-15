# Seafile


## Install pre-requistes

````
sudo apt-get install mysql-server python-imaging python-mysqldb python-setuptools
````


## Create a home
````
sudo mkdir /home/seafile
sudo chown $(whoami):$(whoami) /home/seafile
cd /home/seafile
````

## Install Seafile

Go to https://www.seafile.com/en/download/#server & copy the 64bit version download link then :
````
wget https://bintray.com/artifact/download/seafile-org/seafile/seafile-server_5.1.3_x86-64.tar.gz
tar -zxvf seafile-server*
cd seafile-server*
./setup-seafile-mysql.sh
````

* Server name: Le nom du serveur (pas d’espace dans le nom)
* Server ip/domain : Mettez ici le nom de domaine de votre serveur, ou son IP directement
* Seafile data: Emplacement d’enregistrement des fichiers, celui par défaut est très bien
* Port : le port du serveur Seafile (pas Seahub) est donné par défaut (8082), laissons ainsi (n’oubliez pas d’ouvrir ce port !)
* >>> [1] Create new ccnet/seafile/seahub databases (c’est un choix entre créer ou mettre à jour, ici on crée forcement)
* SQL Server : adresse du serveur SQL, localhost si c’est sur la même machine
* SQL Port : Port du serveur SQL, en général on utilise celui par défaut.
* Password root SQL : Mot de passe de l’user root (ne sera utilisé qu’une seule fois)
* Mysql User : Nom de l’utilisateur SQL dédié à Seafile (sera créé par le programme)
* Pass : Mot de passe de l’utilisateur SQL dédié à Seafile


## Start it

The first is for the seafile server, the second handle the web access :
````
./seafile.sh start && ./seahub.sh start
````

## Create services

### Seafile server
````
sudo nano /etc/systemd/system/seafile.service
````
paste & change user, group, version :
````
[Unit]
Description=Seafile
After=network.target mysql.service

[Service]
Type=oneshot
ExecStart=/home/seafile/seafile-server-5.1.3/seafile.sh start
ExecStop=/home/seafile/seafile-server-5.1.3/seafile.sh stop
RemainAfterExit=yes
User=ME_ME_ME
Group=ME_ME_ME

[Install]
WantedBy=multi-user.target
````

### Seafile web access
````
sudo nano /etc/systemd/system/seahub.service
````
paste & change user, group, version :
````
[Unit]
Description=Seafile hub
After=network.target seafile.service

[Service]
ExecStart=/home/seafile/seafile-server-5.1.3/seahub.sh start
ExecStop=/home/seafile/seafile-server-5.1.3/seahub.sh stop
User=ME_ME_ME
Group=ME_ME_ME
Type=oneshot
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
````

### Activate services
````
sudo systemctl enable seafile.service
sudo systemctl enable seahub.service
````
They now will auto start but you can also use them like that :
````
sudo service seafile start
sudo service seafile stop
````
