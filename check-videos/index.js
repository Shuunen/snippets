const path = require('path')
const find = require('globby')
const fs = require('fs')
const duration = require('get-video-duration').default

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
    const minutes = Math.round(seconds / 60)
    const size = getFileSizeInMB(videoPath)
    const ratio = Math.round(size / minutes)
    const file = `(${ratio}) ${path.basename(videoPath)}`
    if (debug) {
      // log('checked file', `(${ratio}) ${path.basename(videoPath)} is ${minutes} min long and weight ${size} mb, around ${ratio} mb per minute`)
      log('checked file', file)
    }
    if (ratio > 30) {
      return Promise.resolve(file)
    }
  })
}

async function checkVideos () {
  if (process.argv.length <= 2) {
    log('use me via', 'node ' + path.basename(__filename) + ' path/to/directory')
    return process.exit(-1)
  }
  const videosPath = process.argv[2].replace('\\', '//')
  log('scanning dir', videosPath)
  const pattern = videosPath + '/*.{mp4,mkv}'
  log('with pattern', pattern)
  return find(pattern).then(files => Promise.all(files.map(checkVideo)))
}

checkVideos()
  .then((list) => {
    list = list.filter(item => item !== undefined)
    log('found', `${list.length} videos with high ratio`)
    list.map(file => console.log('-', file))
  })
