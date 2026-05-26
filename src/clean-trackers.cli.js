/* v8 ignore start */
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import clipboardy from 'clipboardy'
import { Logger, nbMsInSecond, nbPixelSm, sleep, stringSum } from 'shuutils'
import { cleanTrackers } from './clean-trackers.utils.js'

// use me like :
// 1) copy a list of trackers in clipboard
// 2) bun ~/Projects/github/snippets/src/clean-trackers.cli.js
// 3) the cleaned list is now in clipboard

// you can also use --watch to keep the script running and clean the clipboard each time it changes

const willWatch = process.argv.includes('--watch')
const isVerbose = process.argv.includes('--verbose')
const willCheckFile = process.argv.includes('--file')
const fileInput = path.join(import.meta.dirname, 'clean-trackers.input.txt')
const logger = new Logger({ minimumLevel: isVerbose ? '1-debug' : '3-info' })
let lastSum = 0

/**
 * Emit a beep sound
 */
async function beep() {
  console.log('\u0007')
  await sleep(nbPixelSm)
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
  clipboardy.writeSync(content)
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

async function readClipboard() {
  const content = await clipboardy.read()
  if (!content) {
    log('clipboard is empty')
    return ''
  }
  logger.debug(`found clipboard content : "${content}"`)
  return content
}

function readFile() {
  const exists = statSync(fileInput, { throwIfNoEntry: false })
  if (!exists) {
    logger.debug(`file ${fileInput} does not exist, creating it...`)
    writeFileSync(fileInput, '', 'utf8')
    return ''
  }
  return readFileSync(fileInput, 'utf8')
}

async function readInput() {
  const value = willCheckFile ? readFile() : await readClipboard()
  return value
}

/**
 * Clean the clipboard content
 */
async function doClean() {
  log(`cleaning trackers in ${willCheckFile ? 'file' : 'clipboard (use --file to read file input)'}...`)
  const input = await readInput()
  if (!(input.includes('http') || input.includes('udp'))) {
    log(`no trackers found in input : "${input}"`)
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

if (willWatch) {
  logger.info(`watching ${willCheckFile ? 'file' : 'clipboard'} input...`)
  setInterval(doClean, nbMsInSecond)
} else {
  await doClean()
  await beep()
}
