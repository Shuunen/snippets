const fs = require('fs')
const path = require('path')
let anyWarning = false
let doLogOnly = false
let photosPath = ''

function log(action, message = '') {
  console.log(action + (message.length > 0 ? ' : ' + message : ''))
}

function check(fileName) {
  log('checking file', fileName)
  if (fileName.includes('-tf.')) return log('message', 'photo time is already fixed')
  if (fileName.includes('Acer')) return log('message', 'Acer photos dont need to be renamed')
  rename(fileName)
}

function getGoodName(fileName) {
  const hourString = fileName.slice(5, 7)
  const hourNumber = Number.parseInt(hourString, 10)
  let realHourNumber = hourNumber - 2
  let shouldChangeDay = false

  if (realHourNumber === -2) {
    shouldChangeDay = true
    realHourNumber = 22
  } else if (realHourNumber === -1) {
    shouldChangeDay = true
    realHourNumber = 23
  }

  let realHourString = String(realHourNumber)
  if (realHourString.length < 2) realHourString = '0' + realHourString
  let finalName = fileName.replace(hourString + 'h', realHourString + 'h')

  if (shouldChangeDay) {
    const dayString = fileName.split('th ')[0]
    const dayNumber = Number.parseInt(dayString, 10)
    let realDayNumber = dayNumber - 1
    if (realDayNumber === 0) {
      realDayNumber = 31
      anyWarning = true
      log('WARNING', '31th has been applyied to : ' + fileName)
    }
    const realDayString = String(realDayNumber)
    finalName = fileName.replace(dayString + 'th', realDayString + 'th')
  }
  // mark files to avoid processing them twice or more
  // in  : 19th 19h26-26_[Canon].jpg
  // out : 19th 19h26-26_[Canon]-tf.jpg
  finalName = finalName.replace('].', ']-tf.')
  return finalName
}

function rename(fileName) {
  const newFileName = getGoodName(fileName)
  if (fileName === newFileName) return log('no action required')
  log('will become', newFileName)
  if (doLogOnly) return
  fs.rename(photosPath + '\\' + fileName, photosPath + '\\' + newFileName, function onRename(error) {
    if (error) return console.log(error)
    console.log('renamed complete')
  })
}

function init() {
  if (process.argv.length <= 2) {
    // missing arg
    log('Default usage (log only)', 'node ' + path.basename(__filename) + ' path/to/directory')
    log('to fix and rename files', 'use --fix')
    return process.exit(-1)
  }
  photosPath = process.argv[2]
  doLogOnly = process.argv[3] !== '--fix'
  log('scanning directory', path.dirname(photosPath))
  log('fix active ?', doLogOnly ? 'no' : 'yes')
  // list files in given directory
  fs.readdir(photosPath, function onReadDirectory(error, fileNames) {
    if (error) return console.error(error)
    for (const fileName of fileNames) {
      if (!fileName.includes('.jp')) continue
      console.log('---')
      check(fileName)
    }
    console.log('\n--- THE END ---')
    if (anyWarning) log('WARNING', 'At least 1 warning has been raised')
    if (doLogOnly) log('\nNotice', '--fix was no set, no files renamed')
  })
}

// start program
init()
