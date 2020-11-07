#!/usr/bin/env node
const files = require('./files')
const utils = require('./utils')

async function backup (file) {
  const source = await utils.report(file.source)
  const destination = await utils.report(file.dest)
  if (!source.exists) return utils.log('source file does not exists :', source.path)
  if (!destination.exists) {
    const success = await utils.copy(source.path, destination.path)
    if (success) return utils.log('backed up :', source.path)
    return utils.log('failed at copying :', source.path)
  }
  const sameContent = await utils.equals(source.content, destination.content)
  if (sameContent) return utils.log('backup is up to date :', source.path)
  const isJson = source.path.includes('.json')
  const isIni = source.path.includes('.ini')
  if (isJson || isIni) {
    utils.log('cannot auto back up file :', source.path)
  } else {
    // merge fail beautifully with json files \o/
    const filesMerged = await utils.merge(source.path, destination.path)
    if (!filesMerged) {
      return utils.log('failed to merge file :', source.path)
    }
    utils.log('backed up :', source.path)
  }
  const destinationFile = 'files/' + file.dest.split('configs\\files\\')[1]
  return `merge ${destinationFile} ${utils.normalize(source.path, true)}`
}

async function start () {
  utils.log('Backup start...\n')
  const results = await Promise.all(files.map(file => backup(file)))
  const suggestedCommands = results.filter(result => !!result)
  if (suggestedCommands.length > 0) {
    utils.log('\nTODO :\n=====\n1. review changes on this repo if any\n2. run these to compare backup & local files :\n\n', suggestedCommands.join('\n '))
  } else {
    utils.log('\nNo actions required.')
  }
  utils.log('\nBackup done, have a nice day :)')
}

start()
