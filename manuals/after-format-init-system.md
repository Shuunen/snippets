# Init Windows

- [ ] install [chocolatey](https://chocolatey.org/install)
- [ ] open a cmd with rights and run :

```bash
choco feature enable -n allowGlobalConfirmation
choco install geforce-game-ready-driver autoruns spotify 7zip googlechrome steam git git-credential-manager-for-windows directx jdk8 jre8 microsoft-build-tools nvm vcredist-all visualstudio2017buildtools vscode chocolateygui
```

- [ ] start 7zip and setup file association
- [ ] copy `.ssh` keys
- [ ] copy `documents` saved games
- [ ] install my custom hosts file
- [ ] start `Steam` and add game libraries in `download options > steam library`
- [ ] install missing intel drivers with [Intel Driver Assistant](https://www.intel.fr/content/www/fr/fr/support/detect.html)
- [ ] install missing drivers with [DriversCloud](https://www.driverscloud.com)
- [ ] add quick access to portable apps folder
- [ ] remove win 10 shit with [O&O ShutUp10](https://www.oo-software.com/en/shutup10)
- [ ] use `Apps\RapidEE` to add `global` & `araxis` folder to user path
- [ ] start `Clavier.Plus.Plus` and activate it on startup
- [ ] start `Picasa3` and setup image viewer
- [ ] go to `Eye.Leo` and create a shortcut of `EyeLeo.exe`
- [ ] move the shortcut to `%AppData%\Microsoft\Windows\Start Menu\Programs\Startup`
- [ ] do the same for flux
- [ ] use autoruns to remove useless things at startup
- [ ] open git bash, run :

```bash
nvm install 8.16.0
nvm use 8.16.0
npm install -g nodemon serve @vue/cli @vue/cli-init
cd && mkdir Projects && cd Projects
git clone git@github.com:Shuunen/snippets.git
cd snippets/configs/files/
cp .gitignore ~
cp .gitconfig ~
cp vscode.json ~/AppData/Roaming/Code/User/settings.json
cd ..
./bin/backup.js
```

- [ ] copy package.json & eslintrc.js to ~ and npm install to have a global lint conf with Standard
- [ ] install my recommended extensions

## Optionals

- [ ] install Android Dev Env
