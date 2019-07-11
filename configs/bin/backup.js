#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const home = process.env.HOME
const appData = process.env.APPDATA || (process.platform === 'darwin' ? home + 'Library/Preferences' : home + '/.local/share')
const configs = [`${appData}/Hyper/.hyper.js`, { file: `${appData}/Code/User/settings.json`, renameTo: 'vscode.json' }, `${home}/.gitignore`, `${home}/.gitconfig`]
const backupPath = path.join(process.env.PWD, '/files')
const debug = true
const processOne = false

function copy (source, dest) {
  if (debug) {
    console.log('copy from :', source)
    console.log('copy to   :', dest)
  }
  // destination.txt will be created or overwritten by default.
  fs.copyFile(source, dest, (err) => {
    if (err) throw err
    console.log('backed up :', source)
  })
}

function backup (config) {
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
  copy(source, dest)
}

function start () {
  console.log('starting configs backup')
  if (processOne) {
    backup(configs[0])
  } else {
    configs.map(config => backup(config))
  }
  console.log('\n Tip: you can use "git difftool my-file.json" to check updates\n\n Configs backup done.\n')
}

start()
