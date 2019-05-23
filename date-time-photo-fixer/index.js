var fs = require('fs')
var path = require('path')
var anyWarning = false
var doLogOnly = false
var photosPath = ''

function log (action, message) {
  // in order to align logs :p
  while (action.length < 11) {
    action += ' '
  }
  console.log(action + ' : ' + message)
}

function check (fileName) {
  log('check file', fileName)
  if (fileName.includes('-tf.')) {
    log('message', 'photo time is already fixed')
  } else if (fileName.includes('Acer')) {
    log('message', 'Acer photos dont need to be renamed')
  } else if (fileName.includes('.js')) {
    log('message', 'we dont want to rename js files')
  } else {
    rename(fileName)
  }
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
  log('will become', newFileName)

  if (doLogOnly) {
    return
  }

  fs.rename(photosPath + '\\' + fileName, photosPath + '\\' + newFileName, function (err) {
    if (err) {
      console.log(err)
    } else {
      console.log('renamed complete')
    }
  })
}

function init () {

  if (process.argv.length <= 2) {
    // missing arg
    log('Usage', 'node ' + path.basename(__filename) + ' path/to/directory')
    process.exit(-1)
  } else {
    photosPath = process.argv[2]
    log('scanning directory', path.dirname(photosPath))
    doLogOnly = false
    // list files in given directory
    fs.readdir(photosPath, function (err, fileNames) {
      for (var i = 0; i < fileNames.length; i++) {
        console.log('---')
        check(fileNames[i])
        // break;
      }
      console.log('--- THE END ---')
      if (anyWarning) {
        log('WARNING', 'At least 1 warning has been raised')
      }
      if (doLogOnly) {
        log('Notice', 'doLogOnly was active, no changes done')
      }
    })
  }
}

// start program
init()
