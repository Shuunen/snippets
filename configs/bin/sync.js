#!/usr/bin/env node
const { files } = require('./files')
const { relativeBackupPath } = require('./utils')
const utils = require('./utils')
const dry = process.argv.includes('--dry')
const setup = process.argv.includes('--setup')

async function sync(file) {
  const source = await utils.report(file.source)
  const destination = await utils.report(file.dest)
  if (!source.exists) {
    if (!setup) return utils.log('source file does not exists :', source.path)
    if (dry) return utils.log(`would copy ${utils.filename(destination.path)} to ${source.path}`)
    const success = await utils.copy(destination.path, source.path)
    if (success) return utils.log('file setup :', source.path)
    return utils.log('failed at copying :', destination.path)
  }
  if (!destination.exists) {
    if (dry) return utils.log(`would copy ${source.path} to ${destination.path}`)
    const success = await utils.copy(source.path, destination.path)
    if (success) return utils.log('sync done :', source.path)
    return utils.log('failed at copying :', source.path)
  }
  const sameContent = await utils.equals(source.content, destination.content)
  if (sameContent) return utils.log('sync is up to date :', source.path)
  if (dry) return utils.log(`would merge ${source.path} to ${destination.path}`)
  const filesMerged = await utils.merge(source.path, destination.path)
  if (!filesMerged) return utils.log('failed to merge file :', source.path)
  utils.log('sync done :', source.path)
  return `merge ${relativeBackupPath}/${utils.filename(file.dest)} ${utils.normalize(source.path, true, true)}`
}

async function start() {
  utils.log('\n Sync start...\n')
  const results = await Promise.all(files.map(file => sync(file)))
  const suggestedCommands = results.filter(result => Boolean(result))
  if (suggestedCommands.length > 0) utils.log('\n TODO :\n=====\n1. review changes on this repo if any\n2. run these to compare backup & local files :\n\n', suggestedCommands.join('\n '), '\n')
  else utils.log('\n No actions required.\n')
}

start()
