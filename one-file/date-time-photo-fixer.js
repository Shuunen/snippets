var fs = require('fs')
var path = require('path')
var anyWarning = false
var doLogOnly = false
var photosPath = ''

function log (action, message = '') {
  console.log(action + (message.length ? ' : ' + message : ''))
}

function check (fileName) {
  log('checking file', fileName)
  if (fileName.includes('-tf.')) return log('message', 'photo time is already fixed')
  if (fileName.includes('Acer')) return log('message', 'Acer photos dont need to be renamed')
  rename(fileName)
}

function getGoodName (fileName) {
  var hourStr = fileName.substring(5, 7)
  var hourNum = parseInt(hourStr, 10)
  var realHourNum = hourNum - 2
  var shouldChangeDay = false

  if (realHourNum === -2) {
    shouldChangeDay = true
    realHourNum = 22
  } else if (realHourNum === -1) {
    shouldChangeDay = true
    realHourNum = 23
  }

  var realHourStr = realHourNum + ''
  if (realHourStr.length < 2) {
    realHourStr = '0' + realHourStr
  }

  var finalName = fileName.replace(hourStr + 'h', realHourStr + 'h')

  if (shouldChangeDay) {
    var dayStr = fileName.split('th ')[0]
    var dayNum = parseInt(dayStr, 10)
    var realDayNum = dayNum - 1
    if (realDayNum === 0) {
      realDayNum = 31
      anyWarning = true
      log('WARNING', '31th has been applyied to : ' + fileName)
    }
    var realDayStr = realDayNum + ''
    finalName = fileName.replace(dayStr + 'th', realDayStr + 'th')
  }
  // mark files to avoid processing them twice or more
  // in  : 19th 19h26-26_[Canon].jpg
  // out : 19th 19h26-26_[Canon]-tf.jpg
  finalName = finalName.replace('].', ']-tf.')
  return finalName
}

function rename (fileName) {
  var newFileName = getGoodName(fileName)
  if (fileName === newFileName) return log('no action required')
  log('will become', newFileName)
  if (doLogOnly) return
  fs.rename(photosPath + '\\' + fileName, photosPath + '\\' + newFileName, function onRename (err) {
    if (err) return console.log(err)
    console.log('renamed complete')
  })
}

function init () {
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
  fs.readdir(photosPath, function onReadDir (err, fileNames) {
    if (err) return console.error(err)
    for (var i = 0; i < fileNames.length; i++) {
      const fileName = fileNames[i]
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
