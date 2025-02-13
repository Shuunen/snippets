/* c8 ignore start */
import clipboard from 'clipboardy'
import { execSync } from 'node:child_process'
import { Logger, nbMsInSecond, stringSum } from 'shuutils'
import { cleanTrackers } from './clean-trackers.utils.js'

const willWatch = process.argv.includes('--watch')
const isVerbose = process.argv.includes('--verbose')
const logger = new Logger({ minimumLevel: isVerbose ? '1-debug' : '3-info' })
let lastSum = 0

/**
 * Log a message depending on the watch mode
 * @param {string} message the message to log
 */
function log (message) {
  if (willWatch) { logger.debug(message); return }
  logger.info(message)
}

/**
 * Update the clipboard content
 * @param {string} content the content to copy to clipboard
 */
function updateClipboard (content) {
  log(`will copy this to clipboard :\n---\n${content}\n---`)
  clipboard.writeSync(content)
  logger.info('cleaned clipboard content at', new Date().toLocaleString())
  const isLinux = process.platform === 'linux'
  execSync(`${isLinux ? 'espeak' : 'wsay'} "trackers clean"`)
}

/**
 * Hash a string
 * @param {string} input the input to hash
 * @returns {number} the hash sum
 */
function hash (input) {
  return stringSum(input.trim())
}

/**
 * Clean the clipboard content
 */
// eslint-disable-next-line max-statements
function doClean () {
  log('cleaning trackers...')
  const input = clipboard.readSync()
  if (!input.includes('http') && !input.includes('udp')) { log('no trackers in clipboard'); return }
  const actualSum = hash(input)
  if (actualSum === lastSum) { log('actual content is the same'); return }
  logger.debug(`actual sum : ${actualSum}, last sum : ${lastSum}`)
  lastSum = actualSum
  const output = cleanTrackers(input)
  const outputSum = hash(output)
  if (outputSum === actualSum) { log('output content is the same'); return }
  logger.debug(`input sum : ${actualSum}, output sum : ${outputSum}`)
  updateClipboard(output)
}

logger.info(`clean-trackers.cli start, watch is ${willWatch ? 'on' : 'off'}`)

if (!willWatch) {
  doClean()
  process.exit(0)
}

logger.info('watching clipboard...')
setInterval(doClean, nbMsInSecond)
