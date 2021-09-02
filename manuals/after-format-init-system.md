<!-- markdownlint-disable MD033 -->
# Init

<details>
  <summary>Windows</summary>
  
## Choco

- [ ] install [chocolatey](https://chocolatey.org/install)

## Cmd as admin

```bash
choco feature enable -n allowGlobalConfirmation
choco install directx geforce-game-ready-driver git GoogleChrome launchyqt spotify steam vcredist-all
```

## Chrome or other

- [ ] start sync
- [ ] settings > set as default browser
- [ ] login to github & edit this manual to add missing steps (so meta)

## Explorer

- [ ] pin explorer to task bar
- [ ] make downloads shortcut points to d:
- [ ] options > display : set typical stuff
- [ ] add quick access to portable apps folder
- [ ] copy `.ssh` keys
- [ ] copy `documents` saved games

## Cmd as admin again

- [ ] `D:\Apps\7zip\7zFM.exe` and setup file association for user & context menu
- [ ] `code C:\Windows\System32\drivers\etc\hosts` to customize hosts
- [ ] set env variables with this but copy/paste to notepad to have CRLF & copy/paste into CMD after (thx m$) :

```batch
setx PATH "D:\Android\android-sdk\platform-tools;D:\Android\android-sdk\tools;D:\Android\android-sdk\tools\bin;D:\Apps\_global;D:\Apps\AdoptOpenJDK\jdk8u192-b12\bin;D:\Apps\Araxis;D:\Apps\Python38;D:\Apps\Python38\Scripts;D:\Apps\VS.Code;D:\Apps\Picasa;D:\Apps\Spread.32.Free.Excel.Lite;D:\Apps\VLC;D:\Apps\Mkvtoolnix;D:\Apps\Node\14"
setx ANDROID_HOME "D:\Android\android-sdk"
setx JAVA_HOME "D:\Apps\AdoptOpenJDK\jdk8u192-b12"
```

## Misc

- [ ] start `Apps/Clavier.Plus.Plus` and activate it on startup
- [ ] start Launchy from start menu, set the Ctrl+Shift+K keystroke from clavier++
- [ ] press Win+R , type `shell:startup`, hit Enter, go up one level & drag Launchy shortcut to Startup folder to make it start with windows
- [ ] start `Steam` from start menu and add game libraries in `download options > steam library`, update the default one
- [ ] use autoruns to remove useless things at startup

## Windows

- [ ] activate windows
- [ ] enable windows night luminosity mode
- [ ] enable windows dark mode
- [ ] change machine name
- [ ] use power mode in energy settings
- [ ] remove sound notifications
- [ ] open advanced power settings to prevent hibernation exit via shitty timers
- [ ] open device manager, open settings of ethernet network card, disable ability to exit from hibernation
- [ ] remove more shit with [O&O ShutUp10](https://www.oo-software.com/en/shutup10)
- [ ] restart

## Git bash

- [ ] options : Looks -> dracula theme, Text -> font size to 11, Mouse -> right btn paste, Window 120 x 30

```bash
neofetch > neofetch-once.log
echo -e '#!/bin/bash \n\n eval "$(ssh-agent -s)" \n ssh-add ~/.ssh/id_rsa_gh \n\n alias ll="ls -alhFo --group-directories-first --time-style=long-iso --color=auto" \n\n echo ""\ncat ~/neofetch-once.log \n echo "Welcome ${USERNAME} ^^"' > ~/.bashrc
bash
cd && mkdir Projects && cd Projects
mkdir github && cd github
git clone git@github.com:Shuunen/snippets.git
cd snippets/configs/
node bin/sync.js --setup
```

### Android development environnement

Thanks to preinstalled android env, only these steps are required :

- [ ] install nativescript `npm install -g nativescript` && check all with `tns doctor`
- [ ] open cmd & `"%ANDROID_HOME%/extras/intel/Hardware_Accelerated_Execution_Manager/intelhaxm-android.exe"`
- [ ] then `"%ANDROID_HOME%/extras/intel/Hardware_Accelerated_Execution_Manager/haxm_check.exe"` should gives two yes
- [ ] `avdmanager create avd -n avd_28_xl -k "system-images;android-28;google_apis;x86_64" -d pixel_xl` && `%ANDROID_HOME%/emulator/emulator -avd avd_28_xl` you should see the avd starting

</details>

<details>
  <summary>Linux</summary>

```bash  
sudo apt install screenfetch snapd -y
sudo snap install node --classic --channel=14 # channel is the major version
sudo snap install onefetch
echo -e "alias ..='cd ..' \n alias install='sudo apt install' \n alias apt='sudo apt' \n alias mkdir='mkdir -pv' \n alias merge=meld \n alias whatsmyip='curl http://ipecho.net/plain; echo' \n alias psg='ps aux | grep -v grep | grep -i -e VSZ -e' \n echo '' \n if [ -d '.git' ]; then onefetch; else screenfetch; fi \n echo ' Welcome ${USER} ^^' \n echo ''" > ~/.bash_aliases # make sure bash_aliases is sourced in ~/.bashrc
source ~/.bash_aliases
sudo apt install git aria2 nano curl -y # vvv below is for desktop only vvv
sudo apt install pinta gparted meld xsel shotwell hollywood -y
sudo snap install --classic code
sudo snap install lutris p7zip-desktop kupfer jdownloader2 boxy-svg picard subtitle-edit breaktimer filebot snap-store smart-file-renamer vlc spotify spek MediaInfo FreeFileSync
sudo add-apt-repository ppa:qbittorrent-team/qbittorrent-stable
sudo apt update
sudo apt install qbittorrent -y
sudo apt autoremove -y
echo -e "optional : you can manually run 'sudo apt install ttf-mscorefonts-installer' & 'sudo fc-cache -f -v' to get win fonts & clear font cache"
sudo chmod 700 ~/.ssh/ -R
mkdir ~/Projects/github
cd ~/Projects/github
git clone git@github.com:Shuunen/snippets.git
cd snippets/configs/
node bin/sync.js --setup
```

</details>

<details>
  <summary>All</summary>

```bash
npm config set package-lock false --global # malicious laugth :p
cd ~/Projects/github
git clone git@github.com:Shuunen/flood-it.git
git clone git@github.com:Shuunen/folio.git
git clone git@github.com:Shuunen/goals.git
git clone git@github.com:Shuunen/recipes.git
git clone git@github.com:Shuunen/regex-converter.git
git clone git@github.com:Shuunen/repo-checker.git
git clone git@github.com:Shuunen/shuutils.git
git clone git@github.com:Shuunen/stack.git
git clone git@github.com:Shuunen/stuff-finder.git
git clone git@github.com:Shuunen/td-express.git
git clone git@github.com:Shuunen/user-scripts.git
git clone git@github.com:Shuunen/vue-image-compare.git
git clone git@github.com:Shuunen/what-now.git
code snippets
```

- [ ] install my recommended extensions
- [ ] Do Geekbench, Cinebench, UserBenchmark
- [ ] [pimp with a 2k wallpaper](https://www.google.com/search?q=wallpaper+2k)

</details>
