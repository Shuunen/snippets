const fs = require('fs')
const path = require('path')
const util = require('util')

const readFile = util.promisify(fs.readFile)

const log = console.log.bind(console, '\n')

function clean (str) {
  return str.replace(/[\r\n\s]*/g, '')
}

function areFilesEqual (file1, file2) {
  return Promise.all([readFile(file1, 'utf-8'), readFile(file2, 'utf-8')])
    .then(([content1, content2]) => {
      const areEqual = (clean(content1) === clean(content2))
      // log('file 1 :', file1)
      // log('file 2 :', file2)
      // log('are equal ?', areEqual)
      return areEqual
    })
    .catch(err => {
      if (!err.message.includes('no such file')) {
        console.error(err)
      }
      return false
    })
}

function copy (source, dest) {
  return new Promise(resolve => {
    const from = path.normalize(source)
    const to = path.normalize(dest)
    // destination will be created or overwritten by default.
    fs.copyFile(from, to, (err) => resolve(!err))
  })
}

module.exports = { areFilesEqual, copy, log }
