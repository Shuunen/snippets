# Transmission daemon


## Install
````
apt-get update
apt-get upgrade
apt-get install transmission-daemon
service transmission-daemon stop
````

## Create a user
````
sudo useradd -d /home/downloader -m downloader
sudo usermod -a -G debian-transmission downloader
sudo usermod -a -G debian-transmission YOURSELF
sudo passwd downloader
sudo mkdir /home/downloader/incomplete
sudo chown -R downloader:debian-transmission /home/downloader
sudo chmod -R 770 /home/downloader
````

## Configure
````
sudo nano /etc/transmission-daemon/settings.json
````
**Insert :**
````
{
	"alt-speed-down": 7000,
	"alt-speed-enabled": true,
	"alt-speed-time-begin": 480,
	"alt-speed-time-day": 127,
	"alt-speed-time-enabled": true,
	"alt-speed-time-end": 1439,
	"alt-speed-up": 7000,
	"bind-address-ipv4": "0.0.0.0",
	"bind-address-ipv6": "::",
	"blocklist-enabled": false,
	"blocklist-url": "http://www.example.com/blocklist",
	"cache-size-mb": 4,
	"dht-enabled": true,
	"download-dir": "/home/downloader",
	"download-limit": 100,
	"download-limit-enabled": 0,
	"download-queue-enabled": true,
	"download-queue-size": 5,
	"encryption": 1,
	"idle-seeding-limit": 30,
	"idle-seeding-limit-enabled": false,
	"incomplete-dir": "/home/downloader/incomplete",
	"incomplete-dir-enabled": true,
	"lpd-enabled": false,
	"max-peers-global": 200,
	"message-level": 1,
	"peer-congestion-algorithm": "",
	"peer-id-ttl-hours": 6,
	"peer-limit-global": 200,
	"peer-limit-per-torrent": 50,
	"peer-port": 51413,
	"peer-port-random-high": 65535,
	"peer-port-random-low": 49152,
	"peer-port-random-on-start": false,
	"peer-socket-tos": "default",
	"pex-enabled": true,
	"port-forwarding-enabled": false,
	"preallocation": 1,
	"prefetch-enabled": 1,
	"queue-stalled-enabled": true,
	"queue-stalled-minutes": 30,
	"ratio-limit": 2,
	"ratio-limit-enabled": false,
	"rename-partial-files": true,
	"rpc-authentication-required": true,
	"rpc-bind-address": "0.0.0.0",
	"rpc-enabled": true,
	"rpc-password": "A_GREAT_PASS",
	"rpc-port": 9091,
	"rpc-url": "/transmission/",
	"rpc-username": "A_GREAT_USER",
	"rpc-whitelist": "127.0.0.1",
	"rpc-whitelist-enabled": false,
	"scrape-paused-torrents-enabled": true,
	"script-torrent-done-enabled": false,
	"script-torrent-done-filename": "",
	"seed-queue-enabled": false,
	"seed-queue-size": 10,
	"speed-limit-down": 100,
	"speed-limit-down-enabled": false,
	"speed-limit-up": 100,
	"speed-limit-up-enabled": false,
	"start-added-torrents": true,
	"trash-original-torrent-files": false,
	"umask": 2,
	"upload-limit": 100,
	"upload-limit-enabled": 0,
	"upload-slots-per-torrent": 14,
	"utp-enabled": true
}
````
**Start daemon :**
````
service transmission-daemon start
service transmission-daemon reload
````