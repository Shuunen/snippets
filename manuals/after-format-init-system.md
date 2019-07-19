# Init

- [ ] install [kaspersky](https://www.kaspersky.com/downloads/thank-you/antivirus)
- [ ] install [chocolatey](https://chocolatey.org/install)
- [ ] open a cmd with rights and run :

```bash
choco feature enable -n allowGlobalConfirmation
choco install geforce-game-ready-driver autoruns spotify 7zip googlechrome steam git git-credential-manager-for-windows directx jdk8 jre8 microsoft-build-tools nvm vcredist-all visualstudio2017buildtools vscode
```

- [ ] install [Synology Drive](https://archive.synology.com/download/Tools/SynologyDriveClient/?C=M;O=D)
- [ ] setup folders and **deactivate `SynologyDrive` folder default creation**
- [ ] copy `.ssh` keys
- [ ] copy `documents` saved games
- [ ] install my custom hosts file
- [ ] start `Steam` and add my 2 game library in `download options > steam library`
- [ ] install missing drivers with [DriversCloud](https://www.driverscloud.com)
- [ ] copy folder `Apps/_copy-these-on-ssd` to home and rename it `Apps`
- [ ] install `Apps\portabler\install.bat`
- [ ] use `Apps\RapidEE` to add `global` & `araxis` folder to user path
- [ ] start `Clavier.Plus.Plus` and activate it on startup
- [ ] start `Picasa3` and setup image viewer
- [ ] go to `Eye.Leo` and create a shortcut of `EyeLeo.exe`
- [ ] move the shortcut to `%AppData%\Microsoft\Windows\Start Menu\Programs\Startup`
- [ ] do the same for flux
- [ ] open git bash, run :

```bash
cd && mkdir Projects && cd Projects
nvm install 8.16.0
nvm use 8.16.0
npm install -g nodemon serve
git clone git@github.com:Shuunen/snippets.git
cd snippets/configs/files/
cp .gitignore ~
cp .gitconfig ~
cp vscode.json ~/AppData/Roaming/Code/User/settings.json
cd ..
./bin/backup.js
```

- [ ] install my recommended extensions

## Optionals

- [ ] install Android Dev Env
