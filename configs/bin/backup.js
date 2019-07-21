#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const home = process.env.HOME
const appData = process.env.APPDATA || (process.platform === 'darwin' ? home + 'Library/Preferences' : home + '/.local/share')
const configs = [`${appData}/Hyper/.hyper.js`, { file: `${appData}/Code/User/settings.json`, renameTo: 'vscode.json' }, `${home}/.gitignore`, `${home}/.gitconfig`, `${home}/.repo-checker.js`]
const backupPath = path.join(process.env.PWD, '/files')

function copy (source, dest) {
  return new Promise(resolve => {
    source = path.normalize(source)
    dest = path.normalize(dest)
    // destination.txt will be created or overwritten by default.
    fs.copyFile(source, dest, (err) => {
      console.log('')
      if (err) {
        console.log('no file   :', source)
      } else {
        console.log('local file            :', source)
        console.log('backed up to          :', dest)
        const destFile = 'files/' + dest.split('configs\\files\\')[1]
        console.log('1. develop < > backup : git difftool', destFile)
        console.log('2. backup  < > local  : merge', destFile, source.replace(/\\/g, '/'))
      }
      resolve()
    })
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
  return copy(source, dest)
}

async function start () {
  console.log('\nConfigs backup start')
  await Promise.all(configs.map(config => backup(config)))
  console.log('\n\nConfigs backup done.\n')
}

start()
