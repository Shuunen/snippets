# Init Windows

## Choco

- [ ] install [chocolatey](https://chocolatey.org/install)

## Cmd as admin

```bash
choco feature enable -n allowGlobalConfirmation
choco install autoruns chocolateygui directx geforce-game-ready-driver git GoogleChrome launchyqt nvm.portable spotify steam vcredist-all vscode
```

## Chrome

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
setx PATH "D:\Android\android-sdk\platform-tools;D:\Android\android-sdk\tools;D:\Android\android-sdk\tools\bin;D:\Apps\_global;D:\Apps\AdoptOpenJDK\jdk8u192-b12\bin;D:\Apps\Araxis;D:\Apps\Python38;D:\Apps\Python38\Scripts;C:\Program Files\Microsoft VS Code;D:\Apps\Picasa;D:\Apps\Spread.32.Free.Excel.Lite;D:\Apps\VLC;D:\Apps\Mkvtoolnix"
setx ANDROID_HOME "D:\Android\android-sdk"
setx JAVA_HOME "D:\Apps\AdoptOpenJDK\jdk8u192-b12"
ftype jarfileterm=cmd /s /c java -jar %1 %*
assoc .jar=jarfileterm
ftype VideoFile=vlc.exe %1 %*
assoc .avi=VideoFile
assoc .mkv=VideoFile
assoc .mov=VideoFile
assoc .mp4=VideoFile
assoc .webm=VideoFile
ftype AudioFile=vlc.exe %1 %*
assoc .mp3=AudioFile
ftype SpreadsheetFile=spread32.exe %1 %*
assoc .xls=SpreadsheetFile
ftype TextFile=Code.exe %1 %*
assoc .csv=TextFile
assoc .json=TextFile
assoc .log=TextFile
assoc .md=TextFile
assoc .nfo=TextFile
assoc .xml=TextFile
ftype SubtitleFile=SubtitleEdit.exe %1 %*
assoc .srt=SubtitleFile
ftype ImageFile=PicasaPhotoViewer.exe %1 %*
assoc .jpg=ImageFile
assoc .png=ImageFile
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
- [ ] open advanced power settings to prevent hibernation exit via shitty timers
- [ ] open device manager, open settings of ethernet network card, disable ability to exit from hibernation
- [ ] remove more shit with [O&O ShutUp10](https://www.oo-software.com/en/shutup10)
- [ ] restart

## Git bash

- [ ] options : Looks -> dracula theme, Text -> font size to 11, Mouse -> right btn paste, Window 120 x 30

```bash
nvm ls available
nvm install 12.16.2 # put the latest LTS
nvm use 12.16.2
echo -e '#!/bin/bash\n\neval "$(ssh-agent -s)"\nssh-add ~/.ssh/id_rsa_gh' > ~/.bashrc
bash
cd && mkdir Projects && cd Projects
mkdir shuunen && cd shuunen
git clone git@github.com:Shuunen/alpine-parcel-tailwind.git
git clone git@github.com:Shuunen/bergerac-roads.git
git clone git@github.com:Shuunen/contacto.git
git clone git@github.com:Shuunen/crystal-plan.git
git clone git@github.com:Shuunen/flood-it.git
git clone git@github.com:Shuunen/folio.git
git clone git@github.com:Shuunen/goals.git
git clone git@github.com:Shuunen/green-app.git
git clone git@github.com:Shuunen/recipes.git
git clone git@github.com:Shuunen/regex-converter.git
git clone git@github.com:Shuunen/repo-checker.git
git clone git@github.com:Shuunen/shuutils.git
git clone git@github.com:Shuunen/snippets.git
git clone git@github.com:Shuunen/stuff-finder.git
git clone git@github.com:Shuunen/td-express.git
git clone git@github.com:Shuunen/user-scripts.git
git clone git@github.com:Shuunen/vue-image-compare.git
git clone git@github.com:Shuunen/what-now.git
cd snippets/configs/files/
cp .bashrc ~
cp .gitconfig ~
cp .gitignore ~
cp repo-checker.config.js ~
cp vscode-settings.json ~/AppData/Roaming/Code/User/settings.json
cp vscode-keybindings.json ~/AppData/Roaming/Code/User/keybindings.json
cp launchy.ini ~/AppData/Roaming/Launchy/launchy.ini
mkdir -p ~/AppData/Roaming/Greenshot && cp Greenshot.ini ~/AppData/Roaming/Greenshot/Greenshot.ini
mkdir -p ~/AppData/Roaming/HandBrake && cp handbrake-presets.json ~/AppData/Roaming/HandBrake/presets.json
cd ..
./bin/backup.js
code ..
```

- [ ] install my recommended extensions

## Optionals

- [ ] Do Geekbench, Cinebench & UserBenchmark
- [ ] [pimp with a 2k wallpaper](https://www.google.com/search?q=wallpaper+2k)
- [ ] install minimum drivers with [DriversCloud](https://www.driverscloud.com)

### Android development environnement

Thanks to preinstalled android env, only these steps are required :

- [ ] install nativescript `npm install -g nativescript` && check all with `tns doctor`
- [ ] open cmd & `"%ANDROID_HOME%/extras/intel/Hardware_Accelerated_Execution_Manager/intelhaxm-android.exe"`
- [ ] then `"%ANDROID_HOME%/extras/intel/Hardware_Accelerated_Execution_Manager/haxm_check.exe"` should gives two yes
- [ ] `avdmanager create avd -n avd_28_xl -k "system-images;android-28;google_apis;x86_64" -d pixel_xl` && `%ANDROID_HOME%/emulator/emulator -avd avd_28_xl` you should see the avd starting
