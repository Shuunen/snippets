const path = require('path')

const home = process.env.HOME

const appData = process.env.APPDATA || (process.platform === 'darwin' ? home + 'Library/Preferences' : home + '/.local/share')

const prgFiles = 'C:/Program Files'

const configs = [
  { file: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
  `${home}/.gitignore`, `${home}/.gitconfig`,
  `${home}/.repo-checker.js`,
  { file: `${home}/.eslintrc.js`, renameTo: 'global-lint-eslintrc.js' },
  { file: `${home}/package.json`, renameTo: 'global-lint-package.json' },
  { file: `${prgFiles}/Microsoft Mouse and Keyboard Center/commands.xml`, renameTo: 'keyboard-commands.xml' },
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
