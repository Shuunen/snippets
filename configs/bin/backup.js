#!/usr/bin/env node
const files = require('./files')
const utils = require('./utils')

async function backup (file) {
  const source = await utils.report(file.source)
  const dest = await utils.report(file.dest)
  if (!source.exists) {
    return utils.log('source file does not exists :', source.path)
  }
  if (!dest.exists) {
    const success = await utils.copy(source.path, dest.path)
    if (success) {
      return utils.log('backed up :', source.path)
    }
    return utils.log('failed at copying :', source.path)
  }
  const sameContent = await utils.equals(source.content, dest.content)
  if (sameContent) {
    return utils.log('backup is up to date :', source.path)
  }
  const isJson = source.path.includes('.json')
  if (isJson) {
    utils.log('cannot auto back up json file :', source.path)
  } else {
    // merge fail beautifully with json files \o/
    const filesMerged = await utils.merge(source.path, dest.path)
    if (!filesMerged) {
      return utils.log('failed to merge file :', source.path)
    }
    utils.log('backed up :', source.path)
  }
  const destFile = 'files/' + file.dest.split('configs\\files\\')[1]
  return `merge ${destFile} ${utils.normalize(source.path, true)}`
}

async function start () {
  utils.log('Backup start...\n')
  const results = await Promise.all(files.map(file => backup(file)))
  const suggestedCommands = results.filter(result => !!result)
  if (suggestedCommands.length) {
    utils.log('\nTODO :\n=====\n1. review changes on this repo if any\n2. run these to compare backup & local files :\n\n', suggestedCommands.join('\n '))
  } else {
    utils.log('\nNo actions required.')
  }
  utils.log('\nBackup done, have a nice day :)')
}

start()
