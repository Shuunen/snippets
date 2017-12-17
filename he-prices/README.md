# Musitop

It delete music you don't like and move the one you want to keep.


## Install

Install npm dependencies and set your "input" music folder.

Optional : if you want to move your favorite music, set the "keep" music folder.


## Optional : use the web client on Github.io

This solution let you run only the musitop server, but you'll need to install https certificates.

Go to https://shuunen.github.io/musitop-client/

Because the web client hosted on Github.io is served over https so it will require valid https discussion with Musitop server on your local machine.

Refer to below section : *use Musitop web client over https*

## Optional : use the web client locally

This solution allows you to host your own musitop web client and to choose to use http or https.

Prefer this solution for example if you don't want to install https certificates.

Clone the client from https://github.com/Shuunen/musitop-client :
```
git clone https://github.com/Shuunen/musitop-client.git
```
And set the path to client in your server config :
```
 "clientPath": "/path/to/musitop-client",
 ```
Restart Musitop server and it will serve web client locally.

Then you will be able to use the web client over http or https.

If you want to use https, refer to below section : *use Musitop web client over https*


## Optional : add shortcut folder to your path

Edit your bashrc :
```
gedit ~/.bashrc
```
Add Musitop :
```
MUSITOP=/path/to/musitop/shortcuts
PATH=$PATH:$MUSITOP

export PATH
```
And source :
```
source ~/.bashrc
```
Now you can easilly control Musitop wherever you are :
```
musinext
musigood
musibad
```

## Optional : configure keyboard/joypad bindings

On Ubuntu, go to Keyboard > Custom shortcuts

Click on the "+" to add a new binding

Name it "Musitop Next" for example

And assign this command "bash /home/path-to-musitop/shortcuts/musinext.sh"

Now you can control Musitop with custom bindings :)


## Optional : use Musitop web client over https

On linux :

Install [sslfie](https://github.com/mkropat/sslfie) then :
```
cd /path-to-musitop/certs/
sslfie -o server.crt -k server.key musitop.io
sudo apt install libnss3-tools
certutil -d sql:$HOME/.pki/nssdb -A -t P -n "Musitop" -i server.crt
```
Then restart Chrome and it should be good :)

On windows :
Go to Chrome settings -> Advanced -> Https/Ssl -> Import
Locate & choose "musitop\certs\server.crt"
Choose "Place all certificates in the following store" and browse for "Trusted Root Certification Authorities."
Then restart Chrome and it should be good :)

[Source](http://superuser.com/questions/104146/add-permanent-ssl-certificate-exception-in-chrome-linux/)

On Android (did not worked for me) :
Copy the "musitop\certs\server.crt" to your device.
Then go to Settings -> Security -> Credential storage -> Install from SD card
Locate & choose the certificate

Create an entrie in hosts file with :
```
127.0.0.1   musitop.io
```

## Use

Open command line and npm start.

Musitop will play music files found in input folder.

If you like or dislike, click on the appropriate icons, Musitop will delete bad music and move good music into "keep" folder.


## Huge thanks

* 1by1 : for their [great & lightweight music player](http://mpesch3.de1.cc/1by1.html)
* Aha-Soft : for [pretty icons](https://www.iconfinder.com/aha-soft)
* Artists : for creating amazing music
* Config-prompt : for their [configuration lib](https://github.com/ironSource/node-config-prompt)
* Electron : for their [app & idea](http://electron.atom.io/)
* Express : for their [easy & powerful node server framework](http://expressjs.com/)
* Es-lint : for [keeping the code clean](http://eslint.org/)
* Minimist : for [easy argument parsing](https://github.com/substack/minimist)
* Music-Metadata : for giving an [easy way to read metadata from mp3 files](https://github.com/leetreveil/musicmetadata)
* Node-notifier : for [handy desktop notification](https://github.com/mikaelbr/node-notifier)
* Shuffle-array : for [easy array shuffling](https://github.com/pazguille/shuffle-array)
* Socket IO : for their [web socket lib that's great to use](http://socket.io/) <3
* Vlc : for their [great music player](http://www.videolan.org/vlc/)


## Still to do

* after audio preloading do cover image preloading too
* handle case when server shut down, avoid letting client playing or loading
* handle last music action, like a dropdown that will act on n-1 song : was good, was bad
* add pause icon in systray
* handle case when next track is no more on disk
* handle case when no music left in input folder
* handle case when no music left in playlist
* handle case when song cannot be moved (eg. when destination already exists)
* add a gif demo usage
