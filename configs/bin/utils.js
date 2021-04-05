const { promisify } = require('util')
const { readFile, copyFile, writeFile } = require('fs').promises
const exec = promisify(require('child_process').exec)
const path = require('path')

const log = console.log.bind(console, '')
const clean = string => string.replace(/\s*/g, '')
const equals = (content1, content2) => (clean(content1) === clean(content2))
const filename = (path = '') => (/[/\\]([\w-]*[.\w-]+)$/.exec(path) || [])[1]

const normalize = (filepath, useSlash) => {
  const p = path.normalize(filepath)
  return useSlash ? p.replace(/\\/g, '/') : p
}

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
  await exec('mkdir "' + destFolder + '" -p')
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

module.exports = { equals, copy, log, filename, merge, report, read, normalize }
