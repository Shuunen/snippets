# Plex Media Server

## Install

Go to <https://www.plex.tv/downloads/>

Copy the download link for Ubuntu 64bit and :

```bash
wget https://downloads.plex.tv/plex-media-server/1.0.0.2261-a17e99e/plexmediaserver_1.0.0.2261-a17e99e_amd64.deb
sudo dpkg -i plexmediaserver_*
sudo usermod -a -G debian-transmission plex
```

## Configure

Go to <http://192.168.1.11:32400/web/index.html>
