# Init Windows

- [ ] install [chocolatey](https://chocolatey.org/install)
- [ ] open a cmd with rights and run :

```bash
choco feature enable -n allowGlobalConfirmation
choco install autoruns chocolateygui directx geforce-game-ready-driver git GoogleChrome launchyqt nvm.portable spotify steam vcredist-all vscode
```

> theses apps have to be portable-tested before entering above list : lockhunter jdk8 jre8 qbittorrent vlc 7zip soulseek
> may be useful : visualstudio2017buildtools microsoft-build-tools git-credential-manager-for-windows

- [ ] start 7zip and setup file association
- [ ] copy `.ssh` keys
- [ ] copy `documents` saved games
- [ ] install my custom hosts file
- [ ] start `Steam` and add game libraries in `download options > steam library`
- [ ] install missing intel drivers with [Intel Driver Assistant](https://www.intel.fr/content/www/fr/fr/support/detect.html)
- [ ] install missing drivers with [DriversCloud](https://www.driverscloud.com)
- [ ] add quick access to portable apps folder
- [ ] remove win 10 shit with [O&O ShutUp10](https://www.oo-software.com/en/shutup10)
- [ ] use `Apps\RapidEE` to add `global` & `araxis` folder to user path & these :

```text
ANDROID_HOME=D:\Android\android-sdk
JAVA_HOME=D:\Apps\_previously-installed-apps\AdoptOpenJDK\jdk8u192-b12

Path=D:\Apps\_previously-installed-apps\Python38\Scripts
  D:\Apps\_previously-installed-apps\Python38
  D:\Apps\_previously-installed-apps\Java\jdk1.8.0_211\bin
  D:\Apps\_previously-installed-apps\AdoptOpenJDK\jdk8u192-b12\bin
  D:\Android\android-sdk\tools
  D:\Android\android-sdk\platform-tools
  D:\Android\android-sdk\tools\bin
```

- [ ] start `Clavier.Plus.Plus` and activate it on startup
- [ ] start Launchy, set the Ctrl+Shift+K keystroke from clavier++, add portable app folder & scan
- [ ] press Win+R , type shell:startup , hit Enter, go up one level & drag Launchy shortcut to Stratup folder to make it start with windows
- [ ] start `Picasa3` and setup image viewer
- [ ] go to a folder with jpg or png image and set open as -> chose specific -> use `PicasaPhotoViewer.exe`
- [ ] set windows default apps : VLC, Picasa & Chrome
- [ ] activate windows
- [ ] enable windows night luminosity mode & dark mode
- [ ] change machine name
- [ ] tell windows to use power mode in energy settings
- [ ] use autoruns to remove useless things at startup
- [ ] open git bash, run :

```bash
nvm install 12.16.1
nvm use 12.16.1
echo -e '#!/bin/bash\n\neval "$(ssh-agent -s)"\nssh-add ~/.ssh/id_rsa_gh' > ~/.bashrc
echo -e '\nalias ll="ls -alhFo --group-directories-first --time-style=long-iso --color=auto"' >> ~/.bashrc
bash
cd && mkdir Projects && cd Projects
git clone git@github.com:Shuunen/alpine-parcel-tailwind.git
git clone git@github.com:Shuunen/bergerac-roads.git
git clone git@github.com:Shuunen/contacto.git
git clone git@github.com:Shuunen/crystal-plan.git
git clone git@github.com:Shuunen/flood-it.git
git clone git@github.com:Shuunen/folio.git
git clone git@github.com:Shuunen/green-app.git
git clone git@github.com:Shuunen/regex-converter.git
git clone git@github.com:Shuunen/repo-checker.git
git clone git@github.com:Shuunen/shuutils.git
git clone git@github.com:Shuunen/slack-bot.git
git clone git@github.com:Shuunen/snippets.git
git clone git@github.com:Shuunen/stuff-finder.git
git clone git@github.com:Shuunen/user-scripts.git
git clone git@github.com:Shuunen/vue-image-compare.git
git clone git@github.com:Shuunen/what-now.git
cd snippets/configs/files/
cp .gitignore ~
cp .gitconfig ~
cp .repo-checker.js ~
cp vscode-settings.json ~/AppData/Roaming/Code/User/settings.json
cd ..
./bin/backup.js
code ..
```

- [ ] install my recommended extensions

## Optionals

- [ ] Do Geekbench, Cinebench & UserBenchmark
- [ ] install Android Dev Env
