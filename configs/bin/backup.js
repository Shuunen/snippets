#!/usr/bin/env node
const files = require('./files')
const utils = require('./utils')

async function backup (file) {
  const filesEqual = await utils.areFilesEqual(file.source, file.dest)
  if (filesEqual) {
    return utils.log('backup is up to date for :', file.source)
  }
  const copySuccess = await utils.copy(file.source, file.dest)
  if (!copySuccess) {
    return utils.log('no file or error at copying :', file.source)
  }
  utils.log('backed up :', file.source)
  const destFile = 'files/' + file.dest.split('configs\\files\\')[1]
  return 'git difftool ' + destFile
  // utils.log('2. backup  < > local  : merge', destFile, file.source.replace(/\\/g, '/'))
}

async function start () {
  utils.log('Backup start...')
  const results = await Promise.all(files.map(file => backup(file)))
  const suggestedCommands = results.filter(result => !!result)
  if (suggestedCommands.length) {
    utils.log('suggested commands :\n\n', suggestedCommands.join('\n '))
  }
  utils.log('Backup done.')
}

start()
