/* c8 ignore start */
import clipboard from 'clipboardy'
import { Logger, nbMsInSecond, nbRgbMax, sleep, stringSum } from 'shuutils'
import { cleanTrackers } from './clean-trackers.utils.js'

// use me like :
// 1) copy a list of trackers in clipboard
// 2) bun ~/Projects/github/snippets/one-file/clean-trackers.cli.js
// 3) the cleaned list is now in clipboard

// you can also use --watch to keep the script running and clean the clipboard each time it changes

const willWatch = process.argv.includes('--watch')
const isVerbose = process.argv.includes('--verbose')
const logger = new Logger({ minimumLevel: isVerbose ? '1-debug' : '3-info' })
let lastSum = 0

/**
 * Emit a beep sound
 */
async function beep() {
  console.log('\u0007')
  await sleep(nbRgbMax)
}

/**
 * Log a message depending on the watch mode
 * @param {string} message the message to log
 */
function log(message) {
  if (willWatch) {
    logger.debug(message)
    return
  }
  logger.info(message)
}

/**
 * Update the clipboard content
 * @param {string} content the content to copy to clipboard
 */
async function updateClipboard(content) {
  log(`will copy this to clipboard :\n---\n${content}\n---`)
  clipboard.writeSync(content)
  logger.info('cleaned clipboard content at', new Date().toLocaleString())
  await beep()
}

/**
 * Hash a string
 * @param {string} input the input to hash
 * @returns {number} the hash sum
 */
function hash(input) {
  return stringSum(input.trim())
}

/**
 * Clean the clipboard content
 */
async function doClean() {
  log('cleaning trackers...')
  const input = clipboard.readSync()
  if (!input.includes('http') && !input.includes('udp')) {
    log('no trackers in clipboard')
    return
  }
  const actualSum = hash(input)
  if (actualSum === lastSum) {
    log('actual content is the same')
    return
  }
  logger.debug(`actual sum : ${actualSum}, last sum : ${lastSum}`)
  lastSum = actualSum
  const output = cleanTrackers(input)
  const outputSum = hash(output)
  if (outputSum === actualSum) {
    log('output content is the same')
    return
  }
  logger.debug(`input sum : ${actualSum}, output sum : ${outputSum}`)
  await updateClipboard(output)
}

logger.info(`clean-trackers.cli start, watch is ${willWatch ? 'on' : 'off'}`)

if (!willWatch) {
  await doClean()
  await beep()
  process.exit(0)
}

logger.info('watching clipboard...')
setInterval(doClean, nbMsInSecond)
