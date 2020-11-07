const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)
const readFile = promisify(fs.readFile)
const copyFile = promisify(fs.copyFile)

const log = console.log.bind(console, '')

function clean (string) {
  return string.replace(/\s*/g, '')
}

function equals (content1, content2) {
  return (clean(content1) === clean(content2))
}

function normalize (filepath, useSlash) {
  const p = path.normalize(filepath)
  return useSlash ? p.replace(/\\/g, '/') : p
}

async function read (path) {
  return readFile(path, 'utf-8').catch((error) => {
    if (!error.message.includes('no such file')) {
      console.error(error)
    }
    return false
  })
}

async function report (filepath) {
  const content = await read(filepath)
  return {
    path: normalize(filepath),
    exists: !!content,
    content,
  }
}

async function copy (source, destination) {
  // destination will be created or overwritten by default.
  return copyFile(source, destination).then(() => true).catch((error) => {
    log(error)
    return false
  })
}

async function merge (source, destination) {
  const empty = 'files/empty.txt'
  const cmd = `git merge-file -L "last backup" -L useless -L "local file" ${normalize(destination, true)} ${empty} ${normalize(source, true)}`
  return exec(cmd).catch(() => true).then(() => true)
}

module.exports = { equals, copy, log, merge, report, read, normalize }
