import path from 'path'
import { fileURLToPath } from 'url'

const home = process.env.HOME
const appData = process.env.APPDATA || (process.platform === 'darwin' ? home + 'Library/Preferences' : home + '/.config')
const onWindows = process.env.APPDATA === appData
// const prgFiles = 'C:/Program Files'

const configs = [
  { file: `${appData}/Code/User/keybindings.json`, renameTo: 'vscode-keybindings.json' },
  { file: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
  { file: `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json' },
  { file: `${appData}/HandBrake/settings.json`, renameTo: 'handbrake-settings.json' },
  `${appData}/../Local/Clavier+/Clavier.ini`,
  `${appData}/kupfer/kupfer.cfg`,
  `${appData}/mpv/mpv.conf`,
  `${appData}/qBittorrent/qBittorrent.conf`,
  `${home}/.gitconfig`,
  `${home}/.gitignore`,
  `${home}/.local/share/applications/add-stuff.desktop`,
  `${home}/.local/share/applications/app-image-pool.desktop`,
  `${home}/.local/share/applications/appimagekit-photopea.desktop`,
  `${home}/.local/share/applications/boxy.desktop`,
  `${home}/.local/share/applications/electorrent.desktop`,
  `${home}/.local/share/applications/font-base.desktop`,
  `${home}/.local/share/applications/imagine.desktop`,
  `${home}/.local/share/applications/isolate-lines-clipboard.desktop`,
  `${home}/.local/share/applications/league-of-legends.desktop`,
  `${home}/.local/share/applications/lol-practice-5v5.desktop`,
  `${home}/.local/share/applications/stuff-finder.desktop`,
  `${home}/.local/share/nautilus/scripts/Shrink all pdf`,
  `${home}/.local/share/nautilus/scripts/Take screenshot`,
  `${home}/.local/share/qBittorrent/themes/qbittorrent-darkstylesheet.qbtheme`,
  `${home}/.profile`,
  `${home}/repo-checker.config.js`,
]

if (onWindows) configs.push(
  `${home}/.bashrc`,
  `${appData}/Launchy/launchy.ini`,
  `${appData}/Greenshot/Greenshot.ini`,
)

const currentFolder = path.dirname(fileURLToPath(import.meta.url))

export const backupPath = path.join(currentFolder, '../files')

export const files = configs.map(config => {
  let source = ''
  let filename = ''
  if (typeof config === 'string') {
    source = config
    filename = path.basename(config)
  } else if (typeof config === 'object') {
    source = config.file
    filename = config.renameTo
  } else throw new TypeError('unhandled config format')
  const destination = path.join(backupPath, filename)
  return { source, dest: destination }
})

