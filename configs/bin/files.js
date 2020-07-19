const path = require('path')

const home = process.env.HOME

const appData = process.env.APPDATA || (process.platform === 'darwin' ? home + 'Library/Preferences' : home + '/.local/share')

const prgFiles = 'C:/Program Files'

const configs = [
  { file: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
  { file: `${appData}/Code/User/keybindings.json`, renameTo: 'vscode-keybindings.json' },
  `${home}/.bashrc`,
  `${home}/.bash_profile`,
  `${home}/.gitignore`,
  `${home}/.gitconfig`,
  `${home}/repo-checker.config.js`,
  { file: `${prgFiles}/Microsoft Mouse and Keyboard Center/commands.xml`, renameTo: 'keyboard-commands.xml' },
  `${appData}/Launchy/launchy.ini`,
  `${appData}/Greenshot/Greenshot.ini`,
  { file : `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json'}
]

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
    throw new Error('unhandled config format')
  }
  const dest = path.join(backupPath, filename)
  return { source, dest }
})

module.exports = files
