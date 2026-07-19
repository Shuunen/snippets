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
- `%USERPROFILE%\Projects\github\snippets\src`
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
sudo apt install -y neofetch btop tldr git aria2 nano curl -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
bash # reload shell to be able to invoke nvm
nvm install --lts
# vvv below is for desktop only vvv
sudo apt install gparted meld mediainfo mkvtoolnix mkvtoolnix-gui mpv xsel shotwell synaptic vlc ffmpeg thunar -y
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
sudo dnf install neofetch git aria2 nano curl golang -y # vvv below is for desktop only vvv
sudo dnf install pinta qimgv gparted meld mediainfo mkvtoolnix mkvtoolnix-gui mpv xsel shotwell vlc ffmpeg thunar qbittorrent -y
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

Copy ssh keys then in a **bash terminal** :

```bash
sudo chmod 700 ~/.ssh/ -R # remove 'sudo' on windows
# mkdir ~/.npm-global # if not using nvm
# npm config set prefix '~/.npm-global' # if not using nvm
npm i pnpm bun -g
mkdir ~/Projects/github -p
cd ~/Projects/github
git clone git@github.com:Shuunen/c-est-donne.git
git clone git@github.com:Shuunen/flood-it.git
git clone git@github.com:Shuunen/folio.git
git clone git@github.com:Shuunen/ging.git
git clone git@github.com:Shuunen/goals.git
git clone git@github.com:Shuunen/jozzo.git
git clone git@github.com:Shuunen/recipes.git
git clone git@github.com:Shuunen/regex-converter.git
git clone git@github.com:Shuunen/snippets.git
git clone git@github.com:Shuunen/shuutils.git
git clone git@github.com:Shuunen/stuff-finder.git
git clone git@github.com:Shuunen/user-scripts.git
git clone git@github.com:Shuunen/what-now.git
find . -maxdepth 1 -type d \( ! -name . \) -exec bash -c "cd '{}' && git checkout master && git pull && pnpm i" \;
cd ~/Projects/github/snippets
pnpm run cs --setup
```

- [ ] install my recommended extensions
- [ ] set display screen refresh rate to max
- [ ] Do Geekbench && `geekbench6 --gpu`, `geekbench6 --gpu Vulkan`, `geekbench5 --compute`, Cinebench, UserBenchmark
- [ ] [pimp with a 2k wallpaper](https://www.google.com/search?q=wallpaper+2k)
- [ ] encrypt drive

Setup Jackett :

1. Check [readme](https://github.com/Jackett/Jackett) for install guide
2. Go to your [web dashboard](http://localhost:9117/) and copy your API key (you'll need it in the next steps)
3. Download [latest qBittorrent search plugin for Jackett](https://raw.githubusercontent.com/qbittorrent/search-plugins/refs/heads/master/nova3/engines/jackett.py)
4. Edit the plugin, replace `API_KEY` with the one you copied, then save it
5. In qBittorrent, go to Search > Search plugins > Install a new one, select the plugin file you just edited, then install it
6. You should now see Jackett in the list of search engines, you can use it to search for torrents from the indexers you added in Jackett
7. You may need to run `bash ~/Projects/github/snippets/src/dns-bench.sh` to check the best DNS server for your location, then update it in your network settings
8. Also use your flare solver local instance if any : `http://127.0.0.1:8191`
9. Click on add indexers, filter by public and lang and select the ones you want, then add them all at once
10. Redo the process with FR lang :p
11. Test all indexers with the test button, if some are not working remove them

Nice app to keep in mind :

- [Apostrophe](https://flathub.org/en/apps/org.gnome.gitlab.somas.Apostrophe) : efficient Markdown MD editor
- [Boxy SVG](https://boxy-svg.com/) : simple & effective svg editor
- [Breaktimer](https://breaktimer.app/) : break reminder & eye care
- [BleachBit](https://flathub.org/en/apps/org.bleachbit.BleachBit) : system cleaner
- [Czkawka](https://github.com/qarmin/czkawka/releases/) : duplicate finder & cleaner
- [Digikam](https://www.digikam.org/) : photo collection manager
- [Electorrent](https://github.com/tympanix/Electorrent) : remote torrent gui
- [Espanso](https://espanso.org/) : great cross platform text expander [deb](https://github.com/espanso/espanso/releases/download/v2.3.0/espanso-debian-x11-amd64.deb)
- [Filebot](https://www.filebot.net/) : rename & organize movie/tv shows files
- [FontBase](https://fontba.se/downloads/linux) : font manager
- [FontFinder](https://github.com/mmstick/fontfinder) : font viewer & manager, install fonts from google fonts
- [FSearch](https://github.com/cboxdoerfer/fsearch) : ultra fast search
- [Gdevelop](https://gdevelop.io/) : game development tool
- [GPU Screen Recorder](https://flathub.org/en/apps/com.dec05eba.gpu_screen_recorder) : GPU accelerated screen recorder
- [Identity](https://gitlab.gnome.org/YaLTeR/identity) : compare images & videos
- [Imagine](https://github.com/meowtec/Imagine) : batch image compressor
- [JDownloader2](https://jdownloader.org/) : download manager
- [Kooha](https://github.com/SeaDve/Kooha) : screen recorder super easy to use
- [LosslessCut](https://github.com/mifi/lossless-cut/releases) : cut videos
- [MetaGrabber](https://github.com/andreaswilli/meta-grabber/releases) : get metadata from videos
- [Picard](https://picard.musicbrainz.org/) : music tagger
- [Pinta](https://flathub.org/en/apps/com.github.PintaProject.Pinta) : simple & effective image editor
- [Recoll](https://www.recoll.org/) : desktop gui indexer and search engine
- [Spek](https://github.com/alexkay/spek) : audio spectrum analyzer
- [Stacer](https://github.com/oguzhaninan/Stacer/releases?ref=itsfoss.com) : system cleaner, optimizer, monitoring
- [Teams for Linux](https://github.com/IsmaelMartinez/teams-for-linux) : unofficial teams client
- [ULauncher](https://ulauncher.io) : great app launcher
- [ULauncher Adwaita-gtk4](https://github.com/lighttigerXIV/ulauncher-adwaita-gtk4) : great dark theme for ULauncher
- [ULauncher Custom Scripts](https://github.com/NastuzziSamy/ulauncher-custom-scripts) : allow to run custom scripts from ULauncher
- [Upscayl](https://github.com/upscayl/upscayl) : great image upscale tool
- [Xmind](https://flathub.org/en/apps/net.xmind.XMind) : mind mapping tool

</details>
