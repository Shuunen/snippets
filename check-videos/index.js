const path = require('path')
const find = require('globby')
const fs = require('fs')
const duration = require('get-video-duration').default
const ProgressBar = require('progress')
const logFile = 'debug.log'
const logger = require('tracer').console({ transport: [data => fs.appendFile('./' + logFile, data.rawoutput + '\n', (err) => { if (err) throw err }), data => { if (data.level > 2) console.log(data.message) }] })

let bar = null
let files = []
let errors = 0
let results = []

function getFileSizeInMB (filename) {
  const stats = fs.statSync(filename)
  const size = stats['size']
  return Math.round(size / 1000000.0)
}

async function checkVideo (videoPath) {
  return duration(videoPath)
    .then(seconds => {
      const minutes = Math.round(seconds / 60) || 1
      const size = getFileSizeInMB(videoPath)
      const ratio = Math.round(size / minutes)
      const file = `(${ratio}) ${size} mb - ${videoPath}`
      // logger.log(`checked file ${file} is ${minutes} min long`)
      if (ratio > 30) {
        results.push(file)
      }
    })
    .catch(e => {
      errors++
      logger.log('error on file :', videoPath)
      logger.log('error', e)
    })
    .then(checkNextVideo)
}

async function findVideos () {
  if (process.argv.length <= 2) {
    logger.info(`use me via : node ${path.basename(__filename)} path/to/directory`)
    return process.exit(-1)
  }
  const videosPath = process.argv[2].replace('\\', '//')
  logger.info(`\nScanning dir ${videosPath}`)
  const pattern = videosPath + '/**/*.{mp4,mkv,avi,wmv,m4v,mpg}'
  logger.info(`with pattern ${pattern}\n`)
  files = await find(pattern)
}

async function checkNextVideo () {
  bar.tick()
  if (files.length) {
    return checkVideo(files.shift())
  }
  return Promise.resolve()
}

async function checkVideos () {
  bar = new ProgressBar('Processing   : [:bar] file :current/:total', {
    complete: '=',
    incomplete: ' ',
    total: files.length,
    width: 40
  })
  await checkNextVideo()
}

function showReport () {
  let report = ''
  results = results.filter(file => {
    if (!file) {
      return false
    }
    report += `- ${file}\n`
    return true
  })
  logger.info(`\nFound ${results.length} videos with high ratio`)
  logger.info(report)
  if (errors) {
    logger.error(`Detected ${errors} error(s), please check ${logFile} file`)
  }
}

findVideos()
  .then(checkVideos)
  .then(showReport)
