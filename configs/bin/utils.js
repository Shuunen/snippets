const fs = require('fs')
const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const readFile = util.promisify(fs.readFile)
const copyFile = util.promisify(fs.copyFile)

const log = console.log.bind(console, '')

function clean (str) {
  return str.replace(/[\r\n\s]*/g, '')
}

function equals (content1, content2) {
  return (clean(content1) === clean(content2))
}

function normalize (filepath, useSlash) {
  const p = path.normalize(filepath)
  return useSlash ? p.replace(/\\/g, '/') : p
}

async function read (path) {
  return readFile(path, 'utf-8').catch((err) => {
    if (!err.message.includes('no such file')) {
      console.error(err)
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

async function copy (source, dest) {
  // destination will be created or overwritten by default.
  return copyFile(source, dest).then(() => true).catch((err) => {
    log(err)
    return false
  })
}

async function merge (source, dest) {
  const empty = 'files/empty.txt'
  const cmd = `git merge-file -L "last backup" -L useless -L "local file" ${normalize(dest, true)} ${empty} ${normalize(source, true)}`
  return exec(cmd).catch(() => true).then(() => true)
}

module.exports = { equals, copy, log, merge, report, read, normalize }
