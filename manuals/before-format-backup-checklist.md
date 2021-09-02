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

- [ ] go to `~\.vscode\extensions` and update `snippets\.vscode\extensions.json` if needed
- [ ] go to `~\AppData` and for each Local, LocalLow, Roaming => update snippet/config with missing configs
- [ ] documents folder for game/soft saves/configs
- [ ] copy useful installed apps to a `_previously-installed-apps` folder (backup list & maybe new portable apps)
- [ ] list installed choco packages `choco list --id-only --local-only` and update `after-format-init-system.md` on this repo if needed
- [ ] list other apps that need manual installation

## Linux only

- [ ] wifi/eth security connectivity settings
- [ ] list useful installed programs
  - `apt-mark showmanual`
  - `flatpak list`
  - `snap list`
  - `dpkg --get-selections`

</details>
