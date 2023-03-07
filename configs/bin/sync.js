#!/usr/bin/env node
import { gray, green, red, yellow } from 'shuutils'
import { backupPath, files } from './files.js'
import { copy, filename, normalizePathWithSlash } from './utils.js'
const dry = process.argv.includes('--dry')
const setup = process.argv.includes('--setup')
const debug = process.argv.includes('--debug')
const relativeBackupPath = normalizePathWithSlash(backupPath).replace(normalizePathWithSlash(process.env.PWD ?? '').replace('/c/', 'C:/'), '').slice(1)

/**
 * @type {import('./types.js').Report}
 */
const report = { errors: [], warnings: [], infos: [], success: [], suggestions: [] }

/**
 * Synchronize a file
 * @param {import('./types.js').File} file the file to synchronize
 * @returns {Promise<number>}
 */
// eslint-disable-next-line max-statements, sonarjs/cognitive-complexity
async function sync (file) {
  process.stdout.write('.')
  const { source, destination, equals } = file
  if (!source.exists) {
    if (!setup) return report.infos.push(`source file does not exists : ${source.filepath}`)
    if (dry) return report.infos.push(`would copy ${filename(destination.filepath)} to ${source.filepath}`)
    const success = await copy(destination.filepath, source.filepath)
    if (success) return report.success.push(`file setup : ${source.filepath}`)
    return report.errors.push(`failed at copying : ${destination.filepath}`)
  }
  if (!destination.exists) {
    if (dry) return report.infos.push(`would copy ${source.filepath} to ${destination.filepath}`)
    const success = await copy(source.filepath, destination.filepath)
    if (success) return report.success.push(`sync done : ${source.filepath}`)
    return report.errors.push(`failed at copying : ${source.filepath}`)
  }
  if (equals) return report.success.push(`sync is up to date : ${source.filepath}`)
  report.infos.push(`file should be sync manually : ${source.filepath}`)
  return report.suggestions.push(`merge ${relativeBackupPath}/${filename(destination.filepath)} ${normalizePathWithSlash(source.filepath, true)}`)
}

async function start () {
  process.stdout.write('\nSyncing')
  await Promise.all(files.map(file => sync(file)))
  report.errors.forEach(error => { console.error(red(error)) })
  report.warnings.forEach(warning => { console.warn(yellow(warning)) })
  if (debug) report.infos.forEach(info => { console.info(info) })
  if (debug) report.success.forEach(success => { console.log(green(success)) })
  if (report.suggestions.length > 0) console.log('\n TODO :\n=====\n1. review changes on this repo if any\n2. run these to compare backup & local files :\n\n', report.suggestions.join('\n '), '\n', gray('tip : you can check the configs/changes folder to see the cleaned changes'))
  else console.log(green('\n\nSync done, no actions required :)'))
}

// eslint-disable-next-line unicorn/prefer-top-level-await
start().catch(error => console.error(error))
