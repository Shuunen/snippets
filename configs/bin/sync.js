#!/usr/bin/env node
import { files } from './files.js'
import { report, filename, copy, equals, relativeBackupPath, normalize } from './utils.js'
const dry = process.argv.includes('--dry')
const setup = process.argv.includes('--setup')

async function sync (file) {
  const source = await report(file.source)
  const destination = await report(file.dest)
  if (!source.exists) {
    if (!setup) return console.log('source file does not exists :', source.path)
    if (dry) return console.log(`would copy ${filename(destination.path)} to ${source.path}`)
    const success = await copy(destination.path, source.path)
    if (success) return console.log('file setup :', source.path)
    return console.log('failed at copying :', destination.path)
  }
  if (!destination.exists) {
    if (dry) return console.log(`would copy ${source.path} to ${destination.path}`)
    const success = await copy(source.path, destination.path)
    if (success) return console.log('sync done :', source.path)
    return console.log('failed at copying :', source.path)
  }
  const sameContent = await equals(source.content, destination.content)
  if (sameContent) return console.log('sync is up to date :', source.path)
  console.log('sync file manually :', source.path)
  return `merge ${relativeBackupPath}/${filename(file.dest)} ${normalize(source.path, true, true)}`
}

async function start () {
  console.log('\n Sync start...\n')
  const results = await Promise.all(files.map(file => sync(file)))
  const suggestedCommands = results.filter(result => Boolean(result))
  if (suggestedCommands.length > 0) console.log('\n TODO :\n=====\n1. review changes on this repo if any\n2. run these to compare backup & local files :\n\n', suggestedCommands.join('\n '), '\n')
  else console.log('\n No actions required.\n')
}

start()
