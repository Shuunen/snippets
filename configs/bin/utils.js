const { promisify } = require('util')
const { readFile, copyFile, writeFile, mkdir } = require('fs').promises
const exec = promisify(require('child_process').exec)
const path = require('path')
const { backupPath } = require('./files')

const log = console.log.bind(console, '')
const clean = string => string.replace(/\s*/g, '')
const equals = (content1, content2) => (clean(content1) === clean(content2))
const filename = (path = '') => (/[/\\]([\w-]*[.\w-]+)$/.exec(path) || [])[1]

const normalize = (filepath, useSlash, useTilde) => {
  let p = path.normalize(filepath)
  if (useSlash) p = p.replace(/\\/g, '/')
  if (useTilde) p = p.replace(home, '~')
  return p
}

const home = normalize(process.env.HOME, true)
const relativeBackupPath = normalize(backupPath, true).replace(normalize(process.env.PWD, true), '').slice(1)

const read = async path => readFile(path, 'utf-8').catch(error => {
  if (!error.message.includes('no such file')) console.error(error)
  return false
})

const report = async filepath => {
  let content = await read(filepath)
  if (/\r/.test(content)) {
    content = content.replace(/\r\n/g, '\n')
    writeFile(filepath, content)
  }
  return {
    path: normalize(filepath),
    exists: Boolean(content),
    content,
  }
}

const copy = async (source, destination) => {
  // destination will be created or overwritten by default.
  const destFolder = destination.replace(filename(destination), '')
  await mkdir(destFolder, { recursive: true })
  return copyFile(source, destination).then(() => true).catch(error => {
    log(error)
    return false
  })
}

const merge = async (source, destination) => {
  const empty = 'files/empty.txt'
  const cmd = `git merge-file -L "last backup" -L useless -L "local file" ${normalize(destination, true)} ${empty} ${normalize(source, true)} --union`
  return exec(cmd).catch(() => true).then(() => true)
}

module.exports = { equals, copy, log, filename, merge, report, read, normalize, relativeBackupPath }
