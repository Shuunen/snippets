const path = require('path')
const find = require('globby')
const fs = require('fs')
const duration = require('get-video-duration').default
const ProgressBar = require('progress')

const debug = false

function log (action, message) {
  // align logs :p
  while (action.length < 12) {
    action += ' '
  }
  console.log(action + ' :', message)
}

function getFileSizeInMB (filename) {
  const stats = fs.statSync(filename)
  const size = stats['size']
  return Math.round(size / 1000000.0)
}

async function checkVideo (videoPath) {
  return duration(videoPath).then(seconds => {
    const minutes = Math.round(seconds / 60) || 1
    const size = getFileSizeInMB(videoPath)
    const ratio = Math.round(size / minutes)
    const file = `(${ratio}) ${size} mb - ${videoPath}`
    if (debug) {
      log('checked file', `${file} is ${minutes} min long`)
    }
    if (ratio > 30) {
      return Promise.resolve(file)
    }
  })
}

async function findVideos () {
  if (process.argv.length <= 2) {
    log('use me via', 'node ' + path.basename(__filename) + ' path/to/directory')
    return process.exit(-1)
  }
  const videosPath = process.argv[2].replace('\\', '//')
  log('scanning dir', videosPath)
  const pattern = videosPath + '/**/*.{mp4,mkv,avi,wmv,m4v,mpg}'
  log('with pattern', pattern)
  return find(pattern)
}

async function checkVideos (files) {
  const bar = new ProgressBar('processing   : [:bar] file :current/:total', {
    complete: '=',
    incomplete: ' ',
    total: files.length,
    width: 40
  })
  return Promise.all(files.map(file => {
    bar.tick()
    return checkVideo(file)
  }))
}

function showReport(list) {
  let report = ''
  list = list.filter(file => {
    if(file === undefined) {
      return false
    }
    report += `- ${file}\n`
    return true
  })
  log('found', `${list.length} videos with high ratio`)
  console.log(report)
}

findVideos()
  .then(checkVideos)
  .then(showReport)
