const path = require('path')

const home = process.env.HOME
const appData = process.env.APPDATA || (process.platform === 'darwin' ? home + 'Library/Preferences' : home + '/.config')
const onWindows = process.env.APPDATA === appData
const prgFiles = 'C:/Program Files'

const configs = [
  { file: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
  { file: `${appData}/Code/User/keybindings.json`, renameTo: 'vscode-keybindings.json' },
  `${home}/.gitignore`,
  `${home}/.gitconfig`,
  `${home}/repo-checker.config.js`,
  { file: `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json' },
  { file: `${appData}/HandBrake/settings.json`, renameTo: 'handbrake-settings.json' },
]

if (onWindows) configs.push(
  `${home}/.bashrc`,
  `${appData}/Launchy/launchy.ini`,
  `${appData}/Greenshot/Greenshot.ini`,
)

const backupPath = path.join(process.env.PWD, '/files')

const files = configs.map(config => {
  let source = ''
  let filename = ''
  if (typeof config === 'string') {
    source = config
    filename = path.basename(config)
  } else if (typeof config === 'object') {
    source = config.file
    filename = config.renameTo
  } else {
    throw new TypeError('unhandled config format')
  }
  const destination = path.join(backupPath, filename)
  return { source, dest: destination }
})

module.exports = files
