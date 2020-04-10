# Before format

> A guide to avoid destruction of beloved files

## General

Check these files/folders :

- [ ] desktop
- [ ] global apps/bin
- [ ] downloads
- [ ] hostname & hosts file
- [ ] configs in `~/.config` (rarely interesting)
- [ ] ssh keys, do `ls -la ~/.ssh` to check for existing ones
- [ ] git/npm/xyz configs in home (handled by snippet/config)
- [ ] virtual machines

And these :

- [ ] git projects
- [ ] printers settings/ip
- [ ] start snippet/config

## Windows only

- [ ] go to `~\.vscode\extensions` and update `snippets\.vscode\extensions.json` if needed
- [ ] go to `~\AppData` and for each Local, LocalLow, Roaming => update snippet/config with missing configs
- [ ] documents folder for game/soft saves/configs
- [ ] copy useful installed apps to a `_previously-installed-apps` folder (backup list & maybe new portable apps)
- [ ] list installed choco packages `choco list --id-only --local-only` and update `after-format-init-system.md` on this repo if needed
- [ ] list other apps that need manual installation

## Linux only

- [ ] wifi/eth security connectivity settings
- [ ] list useful installed programs `dpkg --get-selections > /backup/installed-software.log`
