<!-- markdownlint-disable MD033 -->

# Before format

> A guide to avoid destruction of beloved files

<details>
  <summary>Mobile</summary>

- [ ] list useful installed apps
- [ ] backup SD card content and wipe folders
- [ ] authenticator : export accounts, take a picture with another device
- [ ] check if some SMS need to be backup
- [ ] sync various accounts (Google at least)

PS: nothing to do with steam app, steam guard will be overwrite with the new install

</details>

<details>
  <summary>Desktop</summary>

## General

- [ ] connections configs from FileZilla, mRemoteNG, Putty, WinSCP, etc
- [ ] desktop folder
- [ ] downloads folder (should be on another partition)
- [ ] hostname & hosts file
- [ ] anything interesting in user home folder
- [ ] ssh keys, do `ls -la ~/.ssh` to check for existing ones
- [ ] git/npm/xyz configs in home (handled by snippet/config)
- [ ] virtual machines
- [ ] git projects
- [ ] printers settings/ip
- [ ] start snippet/config/sync
- [ ] list of useful installed apps

## Windows only

- [ ] if re-installing windows and need to keep a partition alive like `D:/`, don't forget to disable BitLocker before format
- [ ] do not install any Windows N versions, it will bring issues with Spotify, webcam, etc, thanks windows
- [ ] `%AppData%\FileZilla\sitemanager.xml`
- [ ] `%AppData%\mRemoteNG\confCons.xml`
- [ ] copy useful installed apps to a `_previously-installed-apps` folder
- [ ] backup portable apps folder
- [ ] go to `~\AppData` and for each Local, LocalLow, Roaming => update snippet/config with missing configs
- [ ] start cmd as admin & list installed choco packages `choco list --id-only`, then update `after-format-init-system.md` on this repo if needed
- [ ] list other apps that need manual installation
- [ ] check games in `C:\Games` and if needed, backup saved games in `C:\Users\User\Documents\...`
- [ ] if using a custom windows, update `Projects\github\ntlite-configs\readme.md` with feedbacks

## Linux only

- [ ] wifi/eth security connectivity settings
- [ ] list useful installed programs
  - `apt-mark showmanual`
  - `flatpak list`
  - `snap list`
  - `history | grep apt`
  - `dpkg --get-selections`
- [ ] remember to activate disk encryption on next install

</details>
