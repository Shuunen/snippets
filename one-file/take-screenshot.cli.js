/* c8 ignore start */
/* eslint-disable jsdoc/require-param-description */
/* eslint-disable jsdoc/require-returns */
/* eslint-disable jsdoc/require-returns-description */
/* eslint-disable no-await-in-loop */
import { exec } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { nbSecondsInMinute } from 'shuutils'
import { getFfmpegCommand, getScreenshotFilename, parseUserInput, parseVideoMetadata } from './take-screenshot.utils.js' // js extension is required here

/**
 * @typedef {import('./take-screenshot.types').Metadata} Metadata
 * @typedef {import('./take-screenshot.types').Task} Task
 */

const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const logFile = path.join(currentFolder, 'take-screenshot.log')
const lastInputFile = path.join(currentFolder, 'take-screenshot-last-input.txt')

/**
 *
 */
async function logClear () {
  await fs.writeFile(logFile, '')
}

/**
 * @param  {Date[] | string[]} stuff things to add to the log
 */
async function logAdd (...stuff) {
  await fs.appendFile(logFile, `${stuff.join(' ')}\n`)
}

const ask = createInterface({ input: process.stdin, output: process.stdout })

/**
 * @param {string} cmd
 * @returns {Promise<string>}
 */
async function shellCommand (cmd) {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) console.error(error)
      resolve(stdout || stderr)
    })
  })
}

/**
 * @param {string} filePath
 */
async function deleteFile (filePath) {
  await fs.unlink(filePath).catch(() => 'ok')
}

/**
 * @param {string} filePath
 */
async function getFileSize (filePath) {
  const stats = await fs.stat(filePath)
  return stats.size
}

/**
 * @param {string} filePath
 */
async function getVideoMetadata (filePath) {
  const output = await shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${filePath}" `)
  // eslint-disable-next-line no-restricted-syntax
  if (!output.startsWith('{')) throw new Error(`ffprobe output should be JSON but got :${output}`)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = JSON.parse(output)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const metadata = parseVideoMetadata(data)
  if (metadata.size === 0) metadata.size = await getFileSize(filePath)
  metadata.filepath = filePath
  return metadata
}

/**
 *
 */
function asciiWelcome () {
  console.log(`
  ~|~ _ |  _   (~ _ _ _  _  _  _|_  _ _|_
   | (_||<(/_  _)(_| (/_(/_| |_\\| |(_) |
  `)
}

/**
 * @param {number} totalSeconds
 * @param {Metadata} metadata
 * @returns {Task}
 */
function getTask (totalSeconds, metadata) {
  if (metadata.filepath === undefined)
    // eslint-disable-next-line no-restricted-syntax
    throw new Error('missing filepath')
  const screenName = getScreenshotFilename(totalSeconds, metadata)

  const screenPath = path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', 'Pictures', screenName)
  return { screenPath, totalSeconds, videoPath: metadata.filepath }
}

/**
 * @param {string} input
 * @returns {Promise<Task[]>}
 */
async function getTasks (input) {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const videoPath = process.argv[2]
  // eslint-disable-next-line no-restricted-syntax
  if (videoPath === undefined) throw new Error('no video path')
  const videoName = path.basename(videoPath)
  const meta = await getVideoMetadata(videoPath)
  if (meta.title.length <= videoName.length) meta.title = videoName
  await logAdd(`\n- videoPath : ${videoPath}\n- videoName : ${videoName}\n- title : ${meta.title}`)
  const targetsTotalSeconds = parseUserInput(input).map(({ minutes, seconds }) => minutes * nbSecondsInMinute + seconds)
  return targetsTotalSeconds.map(totalSeconds => getTask(totalSeconds, meta))
}

/**
 * @param {string} input
 */
async function takeScreenAt (input) {
  await logAdd(`Input : "${input}"`)
  void fs.writeFile(lastInputFile, input)
  const tasks = await getTasks(input)
  await logAdd(`Tasks prepared : ${tasks.length}`)
  for (const task of tasks) {
    const cmd = getFfmpegCommand(task)
    await deleteFile(task.screenPath)
    await logAdd('Command :', cmd)
    await logAdd(await shellCommand(cmd))
  }
  process.exit(0)
}

/**
 *
 */
async function init () {
  asciiWelcome()
  await logClear()
  await logAdd('Take screenshot starts @', new Date().toISOString())
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers, no-restricted-syntax
  if (process.argv[2] === undefined) throw new Error('missing videoPath')
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  if (process.argv[3] !== undefined) { await takeScreenAt(process.argv[3]); return }
  const lastInput = await fs.readFile(lastInputFile, 'utf8').catch(() => '60')
  await logAdd('Last input :', lastInput)
  ask.question(`  Please type the time in mmss or ss (enter to use "${lastInput}") : `, async (time) => { await takeScreenAt(time || lastInput) }) // eslint-disable-line @typescript-eslint/no-misused-promises
}

await init().catch(async error => { await logAdd(`Init global error : ${error}`) })
