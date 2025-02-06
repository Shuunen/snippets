<!-- markdownlint-disable MD033 -->
# Init

<details>
  <summary>Windows</summary>
  
## Choco

- [ ] install [chocolatey](https://chocolatey.org/install)

Please **use choco to install Chrome**, else file association can be broken, just experienced it with a fresh Win 11 install :/

## Cmd as admin

Minimal install :

```bash
choco feature enable -n allowGlobalConfirmation
choco install ^
chocolateygui ^
nvidia-display-driver ^
spotify
```

Full install :

```bash
choco feature enable -n allowGlobalConfirmation
choco install ^
7zip.install ^
adb ^
airexplorer ^
ant-renamer ^
audacity ^
autohotkey.portable ^
autoruns ^
avidemux ^
balcon ^
bulk-crap-uninstaller ^
chocolateygui ^
clavier-plus.install ^
cpu-z.install ^
deezer ^
deno ^
digikam ^
directx ^
discord.install ^
dnsjumper ^
dotnet ^
dotnet-desktopruntime ^
dotnet-runtime ^
dotnetcore ^
dotnetcore-runtime ^
dotnetfx ^
espanso ^
exiftool ^
exiftoolgui ^
ffmpeg ^
filebot ^
filezilla ^
Firefox ^
geekbench5 ^
geekbench6 ^
geforce-experience ^
git.install ^
gnumeric ^
golang ^
GoogleChrome ^
gpu-z ^
greenshot ^
handbrake.install ^
hashmyfiles ^
hpusbdisk ^
hyperfine ^
imageglass ^
InkScape ^
io-unlocker ^
irfanview ^
irfanviewplugins ^
javaruntime ^
jbs ^
jre8 ^
launchyqt ^
LinkShellExtension ^
lockhunter ^
lossless-cut ^
makemkv ^
mediainfo ^
mkcert ^
mkvtoolnix ^
mpv.install ^
mRemoteNG ^
NETworkManager ^
notepadplusplus.install ^
onlyoffice ^
openhardwaremonitor ^
paint.net ^
picard ^
powertoys ^
procexp ^
python2 ^
python3 ^
qbittorrent ^
rapidee ^
riot ^
rufus ^
shutup10 ^
soulseek ^
speccy ^
spek ^
spotify ^
steam ^
streamlabs-obs ^
stretchly ^
subtitleedit ^
sumatrapdf.install ^
sunshine ^
svg-explorer-extension ^
tagscanner ^
teamviewer ^
treesizefree ^
usbdeview ^
vcredist-all ^
virtualdub ^
virustotaluploader ^
vlc ^
vscode.install ^
webview2-runtime ^
winfetch ^
winmerge ^
yarn
```

Remember last line should not have any `^`, the special char that tells windows cmd to process a multi line command.

Avoid :

- geforce-game-ready-driver : each choco update rollback to old graphic drivers
- pnpm : use npm instead

## Environment variables

Open Rapidee & add these to the user path :

- `%USERPROFILE%\.npm-global`
- `%USERPROFILE%\Projects\github\snippets\one-file`
- `C:\ProgramData\chocolatey\bin`
- `D:\Apps\_Globals`
- `D:\Apps\Espanso_221_2024-08`
- `D:\Apps\Java-JDK_220_2024-06\bin`
- `D:\Apps\MKVToolNix_860_2024-07`
- `D:\Apps\Node_221_2024-11`
- `D:\Apps\Python_310_2024-10\Scripts`
- `D:\Apps\Python_310_2024-10`
- `D:\Apps\VS.Code_2024-11`
- `D:\Apps\WinMerge_216_2024-07`
- `D:\Apps`

Also for Java add these user variables :

- `JAVA_HOME` : `D:\Apps\Java-JDK_220_2024-06`
- `EXE4J_JAVA_HOME` : `D:\Apps\Java-JDK_220_2024-06`

## Chrome or other

- [ ] start sync
- [ ] settings > set as default browser
- [ ] login to github & edit this manual to add missing steps (so meta)
- [ ] setup violent-monkey settings > sync > google drive > authorize

## Espanso

Open a cmd in `D:\Apps\Espanso` as user & run :

```bash
espanso install actually-all-emojis-spaces
espanso install tableflip-package
espanso install kaimoji
```

## Tweaks

Open a powershell as admin & run :

```bash
irm https://christitus.com/win | iex
```

## Explorer

- [ ] pin explorer to task bar
- [ ] make downloads shortcut points to d:
- [ ] options > display : set typical stuff
- [ ] add quick access to portable apps folder
- [ ] copy `.ssh` keys
- [ ] copy `documents` saved games

## Misc

- [ ] press Win+R , type `shell:startup`, hit Enter, go up one level & drag Launchy shortcut to Startup folder to make it start with windows
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
- [ ] install [ExplorerPatcher](https://github.com/valinet/ExplorerPatcher/releases)
- [ ] remove more shit with [O&O ShutUp10](https://www.oo-software.com/en/shutup10)
- [ ] restart
- [ ] as a user, open cmd and `D:\Apps\_Globals\winfetch.bat > fetch-once.log`, open & check that `fetch-once.log` is correct

## Git bash

- [ ] options : Looks -> Dracula theme, Text -> font size to 11, Mouse -> right btn paste, Window 120 x 30

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
  <summary>Debian based : Ubuntu, Mint, PopOs...</summary>
  <br>
  
Install these deb :

- [Chrome](https://www.google.com/intl/fr_fr/chrome)
- [VsCode](https://code.visualstudio.com/download)
- [Steam](https://store.steampowered.com/about)
- [Stretchly](https://github.com/hovancik/stretchly/releases)

```bash  
sudo apt install -y neofetch git aria2 nano curl -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
bash # reload shell to be able to invoke nvm
nvm install 20
# vvv below is for desktop only vvv
sudo apt install gparted meld mediainfo mkvtoolnix mkvtoolnix-gui mpv xsel shotwell synaptic vlc ffmpeg -y
sudo apt update
sudo apt autoremove -y
echo -e "optional : you can manually run 'sudo apt install ttf-mscorefonts-installer' & 'sudo fc-cache -f -v' to get win fonts & clear font cache"
```

</details>

<details>
  <summary>CentOS, Fedora and Red Hat based : Nobara</summary>
  <br>

  Install these rpm :

- [Chrome](https://www.google.com/intl/fr_fr/chrome)
- [VsCode](https://code.visualstudio.com/download)

```bash
sudo snap install node --classic --channel=18 # sudo dnf module install nodejs:18/common # not working on Nobara 38
sudo dnf install neofetch git aria2 nano curl -y # vvv below is for desktop only vvv
sudo dnf install pinta gparted meld mediainfo mkvtoolnix mkvtoolnix-gui mpv xsel shotwell vlc ffmpeg qbittorrent -y
```

To use XBox 360 controller on Nobara :

```bash
sudo dnf copr enable petrb/xboxdrv -y
sudo dnf install xboxdrv -y
lsmod | grep xpad # should return nothing, if not : sudo rmmod xpad / sudo rmmod hid_xpadneo / ...

```

</details>

<details>
  <summary>All</summary>

  Copy ssh keys then :
  
  ```bash
sudo chmod 700 ~/.ssh/ -R # remove 'sudo' on windows
# mkdir ~/.npm-global # if not using nvm
# npm config set prefix '~/.npm-global' # if not using nvm
npm i pnpm -g
mkdir ~/Projects/github -p
cd ~/Projects/github
git clone git@github.com:Shuunen/c-est-donne.git
git clone git@github.com:Shuunen/eslint-plugin-shuunen.git
git clone git@github.com:Shuunen/flood-it.git
git clone git@github.com:Shuunen/folio.git
git clone git@github.com:Shuunen/ging.git
git clone git@github.com:Shuunen/goals.git
git clone git@github.com:Shuunen/jozzo.git
git clone git@github.com:Shuunen/recipes.git
git clone git@github.com:Shuunen/regex-converter.git
git clone git@github.com:Shuunen/repo-checker.git
git clone git@github.com:Shuunen/shuutils.git
git clone git@github.com:Shuunen/snippets.git
git clone git@github.com:Shuunen/stuff-finder.git
git clone git@github.com:Shuunen/user-scripts.git
git clone git@github.com:Shuunen/vue-image-compare.git
git clone git@github.com:Shuunen/what-now.git
find . -maxdepth 1 -type d \( ! -name . \) -exec bash -c "cd '{}' && git checkout master && git pull && pnpm i" \;
node snippets/configs/bin/sync.js --setup
```

- [ ] install my recommended extensions
- [ ] set display screen refresh rate to max
- [ ] Do Geekbench && `geekbench6 --gpu`, `geekbench5 --compute`, Cinebench, UserBenchmark
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
- [Kooha](https://github.com/SeaDve/Kooha) : screen recorder super easy to use
- [LosslessCut](https://github.com/mifi/lossless-cut/releases) : cut videos
- [MetaGrabber](https://github.com/andreaswilli/meta-grabber/releases) : get metadata from videos
- [Picard](https://picard.musicbrainz.org/) : music tagger
- [Spek](https://github.com/alexkay/spek) : audio spectrum analyzer
- [ULauncher](https://ulauncher.io) : great app launcher
- [ULauncher Adwaita-gtk4](https://github.com/lighttigerXIV/ulauncher-adwaita-gtk4) : great dark theme for ULauncher
- [ULauncher Custom Scripts](https://github.com/NastuzziSamy/ulauncher-custom-scripts) : allow to run custom scripts from ULauncher
- [Upscayl](https://github.com/upscayl/upscayl) : great image upscale tool

</details>
