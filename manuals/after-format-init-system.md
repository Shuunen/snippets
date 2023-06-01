<!-- markdownlint-disable MD033 -->
# Init

<details>
  <summary>Windows</summary>
  
## Choco

- [ ] install [chocolatey](https://chocolatey.org/install)

## Cmd as admin

```bash
choco feature enable -n allowGlobalConfirmation
choco install ^
7zip.install ^
adb ^
airexplorer ^
ant-renamer ^
araxismerge ^
audacity ^
autohotkey.portable ^
autoruns ^
avidemux ^
bulk-crap-uninstaller ^
chocolatey ^
chocolatey-compatibility.extension ^
chocolatey-core.extension ^
chocolatey-dotnetfx.extension ^
chocolatey-misc-helpers.extension ^
chocolatey-windowsupdate.extension ^
chocolateygui ^
clavier-plus.install ^
cpu-z.install ^
deezer ^
deno ^
digikam ^
directx ^
discord.install ^
dnsjumper ^
dotnet-6.0-desktopruntime ^
dotnet-7.0-desktopruntime ^
dotnet-desktopruntime ^
DotNet3.5 ^
DotNet4.5.2 ^
dotnetfx ^
exiftool ^
exiftoolgui ^
ffmpeg ^
filebot ^
filezilla ^
geekbench5 ^
geforce-experience ^
Ghostscript ^
Ghostscript.app ^
git.install ^
gnumeric ^
GoogleChrome ^
gpu-z ^
greenshot ^
handbrake.install ^
hashmyfiles ^
hpusbdisk ^
hyperfine ^
imageglass ^
InkScape ^
irfanview ^
irfanviewplugins ^
javaruntime ^
jbs ^
jre8 ^
KB2919355 ^
KB2919442 ^
KB2999226 ^
KB3033929 ^
KB3035131 ^
KB3063858 ^
launchyqt ^
lockhunter ^
lossless-cut ^
makemkv ^
mediainfo ^
mkvtoolnix ^
mpv.install ^
netfx-4.7.2 ^
nodejs-lts ^
notepadplusplus.install ^
onlyoffice ^
openhardwaremonitor ^
paint.net ^
picard ^
pnpm ^
powertoys ^
procexp ^
python3 ^
qbittorrent ^
rapidee ^
riot ^
rufus ^
shutup10 ^
slack ^
soulseek ^
speccy ^
spek ^
spotify ^
steam ^
streamlabs-obs ^
stretchly ^
subtitleedit ^
sumatrapdf.portable ^
svg-explorer-extension ^
tagscanner ^
treesizefree ^
usbdeview ^
vcredist-all ^
vcredist140 ^
vcredist2005 ^
vcredist2008 ^
vcredist2010 ^
vcredist2012 ^
vcredist2013 ^
vcredist2015 ^
vcredist2017 ^
virtualdub ^
virustotaluploader ^
vlc.install ^
vscode.install ^
webview2-runtime ^
winfetch ^
yarn ^
winmerge
```

Remember last line should not have any `^`, the special char that tells windows cmd to process a multi line command.

Avoid :

- geforce-game-ready-driver : each choco update rollback to old graphic drivers

## Chrome or other

- [ ] start sync
- [ ] settings > set as default browser
- [ ] login to github & edit this manual to add missing steps (so meta)
- [ ] setup violent-monkey settings > sync > google drive > authorize

## Explorer

- [ ] pin explorer to task bar
- [ ] make downloads shortcut points to d:
- [ ] options > display : set typical stuff
- [ ] add quick access to portable apps folder
- [ ] copy `.ssh` keys
- [ ] copy `documents` saved games

## Misc

- [ ] use autoruns to remove useless things at startup
- [ ] start & setup Stretchly

## Windows

- [ ] activate windows
- [ ] enable windows night luminosity mode
- [ ] enable windows dark mode
- [ ] disable XBox game bar
- [ ] enable BitLocker
- [ ] change machine name
- [ ] use power mode in energy settings
- [ ] remove sound notifications
- [ ] open advanced power settings to prevent hibernation exit via shitty timers
- [ ] open device manager, open settings of ethernet network card, disable ability to exit from hibernation
- [ ] remove more shit with [O&O ShutUp10](https://www.oo-software.com/en/shutup10)
- [ ] restart
- [ ] as a user, open cmd and `C:\tools\winfetch\winfetch.bat > fetch-once.log`, open & check that `fetch-once.log` is correct

## Git bash

- [ ] options : Looks -> dracula theme, Text -> font size to 11, Mouse -> right btn paste, Window 120 x 30

```bash
echo -e '#!/bin/bash \n\n eval "$(ssh-agent -s)" \n ssh-add ~/.ssh/id_rsa_gh \n echo "Welcome ${USERNAME} ^^"' > ~/.bashrc
bash
cd && mkdir Projects && cd Projects
mkdir github && cd github
pnpm setup
pnpm i ts-node -g # remember to use --transpileOnly
git clone git@github.com:Shuunen/snippets.git
cd snippets
pnpm install
rm ~/.bashrc
node configs/bin/sync.js --setup
```

### Android development environnement
  
Set env variables with this but copy/paste to notepad to have CRLF & copy/paste into CMD after (thx m$) :

```batch
setx PATH "D:\Android\android-sdk\platform-tools;D:\Android\android-sdk\tools;D:\Android\android-sdk\tools\bin;D:\Apps\AdoptOpenJDK\jdk8u192-b12\bin;D:\Apps\Node\14"
setx ANDROID_HOME "D:\Android\android-sdk"
setx JAVA_HOME "D:\Apps\AdoptOpenJDK\jdk8u192-b12"
```

Then :

- [ ] install nativescript `npm install -g nativescript` && check all with `tns doctor`
- [ ] open cmd & `"%ANDROID_HOME%/extras/intel/Hardware_Accelerated_Execution_Manager/intelhaxm-android.exe"`
- [ ] then `"%ANDROID_HOME%/extras/intel/Hardware_Accelerated_Execution_Manager/haxm_check.exe"` should gives two yes
- [ ] `avdmanager create avd -n avd_28_xl -k "system-images;android-28;google_apis;x86_64" -d pixel_xl` && `%ANDROID_HOME%/emulator/emulator -avd avd_28_xl` you should see the avd starting

</details>

<details>
  <summary>Linux</summary>
  <br>
  
Install these deb :

- [Chrome](https://www.google.com/intl/fr_fr/chrome)
- [VsCode](https://code.visualstudio.com/download)
- [Steam](https://store.steampowered.com/about)
- [Stretchly](https://github.com/hovancik/stretchly/releases)

```bash  
wget -qO- https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs screenfetch
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
npm i pnpm ts-node -g # remember to use --transpileOnly
echo -e "alias ..='cd ..' \n alias install='sudo apt install' \n alias apt='sudo apt' \n alias mkdir='mkdir -pv' \n alias merge=meld \n alias whatsmyip='curl http://ipecho.net/plain; echo' \n alias psg='ps aux | grep -v grep | grep -i -e VSZ -e' \n echo '' \n screenfetch \n echo ' Welcome ${USER} ^^' \n echo ''" > ~/.bash_aliases # make sure bash_aliases is sourced in ~/.bashrc
source ~/.bash_aliases
sudo apt install git aria2 nano curl -y # vvv below is for desktop only vvv
sudo apt install pinta gparted kupfer meld mediainfo mkvtoolnix mkvtoolnix-gui mpv xsel shotwell synaptic hollywood vlc ffmpeg -y
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
cd ~/Projects/github
git clone git@github.com:Shuunen/c-est-donne.git
git clone git@github.com:Shuunen/eslint-plugin-shuunen.git
git clone git@github.com:Shuunen/finga.git
git clone git@github.com:Shuunen/flood-it.git
git clone git@github.com:Shuunen/folio.git
git clone git@github.com:Shuunen/ging.git
git clone git@github.com:Shuunen/goals.git
git clone git@github.com:Shuunen/musiblox.git
git clone git@github.com:Shuunen/ntlite-configs.git
git clone git@github.com:Shuunen/recipes.git
git clone git@github.com:Shuunen/regex-converter.git
git clone git@github.com:Shuunen/repo-checker.git
git clone git@github.com:Shuunen/shuutils.git
git clone git@github.com:Shuunen/stuff-finder.git
git clone git@github.com:Shuunen/user-scripts.git
git clone git@github.com:Shuunen/vue-image-compare.git
git clone git@github.com:Shuunen/wcs-demo.git
git clone git@github.com:Shuunen/wcs.git
git clone git@github.com:Shuunen/what-now.git
find . -maxdepth 1 -type d \( ! -name . \) -exec bash -c "cd '{}' && pnpm i" \;
code snippets
```

- [ ] install my recommended extensions
- [ ] set display screen refresh rate to max
- [ ] Do Geekbench && `geekbench5 --compute OpenCL`, Cinebench, UserBenchmark
- [ ] [pimp with a 2k wallpaper](https://www.google.com/search?q=wallpaper+2k)
- [ ] encrypt drive

Nice app to keep in mind :

- [Boxy SVG](https://boxy-svg.com/) : simple & effective svg editor
- [Breaktimer](https://breaktimer.app/) : break reminder & eye care
- [Czkawka](https://github.com/qarmin/czkawka/releases/) : duplicate finder & cleaner
- [Digikam](https://www.digikam.org/) : photo collection manager
- [Electorrent](https://github.com/tympanix/Electorrent) : remote torrent gui
- [Filebot](https://www.filebot.net/) : rename & organize movie/tv shows files
- [FontBase](https://fontba.se/downloads/linux) : font manager
- [FontFinder](https://github.com/mmstick/fontfinder) : font viewer & manager, install fonts from google fonts
- [FSearch](https://github.com/cboxdoerfer/fsearch) : ultra fast search
- [Gdevelop](https://gdevelop.io/) : game development tool
- [Identity](https://gitlab.gnome.org/YaLTeR/identity) : compare images & videos
- [Imagine](https://github.com/meowtec/Imagine) : batch image compressor
- [JDownloader2](https://jdownloader.org/) : download manager
- [LosslessCut](https://github.com/mifi/lossless-cut/releases) : cut videos
- [MetaGrabber](https://github.com/andreaswilli/meta-grabber/releases) : get metadata from videos
- [Picard](https://picard.musicbrainz.org/) : music tagger
- [Spek](https://github.com/alexkay/spek) : audio spectrum analyzer
- [Upscayl](https://github.com/upscayl/upscayl) : great image upscale tool

</details>
