/* eslint-disable no-await-in-loop */
import { exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import { nbSecondsInMinute } from 'shuutils'
import { fileURLToPath } from 'url'
import { getFfmpegCommand, getScreenshotFilename, parseUserInput, parseVideoMetadata } from './take-screenshot.utils.js' // js extension is required here

/**
 * @typedef {import('./take-screenshot.utils.js').Metadata} Metadata
 * @typedef {import('./take-screenshot.utils.js').Task} Task
 */

const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const logFile = path.join(currentFolder, 'take-screenshot.log')
const lastInputFile = path.join(currentFolder, 'take-screenshot-last-input.txt')

async function logClear () {
  await fs.writeFile(logFile, '')
}

/**
 * @param  {Date[] | string[]} stuff
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
  // eslint-disable-next-line promise/avoid-new
  return await new Promise((resolve) => {
    // eslint-disable-next-line security/detect-child-process
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
  if (!output.startsWith('{')) throw new Error(`ffprobe output should be JSON but got :${output}`)
  const data = JSON.parse(output)
  const metadata = parseVideoMetadata(data)
  if (metadata.size === 0) metadata.size = await getFileSize(filePath)
  metadata.filepath = filePath
  return metadata
}

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
    throw new Error('missing filepath')
  const screenName = getScreenshotFilename(totalSeconds, metadata)

  const screenPath = path.join(process.env.HOME || process.env.USERPROFILE || '', 'Pictures', screenName)
  return { screenPath, totalSeconds, videoPath: metadata.filepath }
}

/**
 * @param {string} input
 * @returns {Promise<Task[]>}
 */
async function getTasks (input) {
  // eslint-disable-next-line prefer-destructuring, no-magic-numbers
  const videoPath = process.argv[2]
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
  fs.writeFile(lastInputFile, input)
  const tasks = await getTasks(input)
  for (const task of tasks) {
    const cmd = getFfmpegCommand(task)
    await deleteFile(task.screenPath)
    await logAdd('Command :', cmd)
    await logAdd(await shellCommand(cmd))
  }
  process.exit(0)
}

async function init () {
  asciiWelcome()
  await logClear()
  await logAdd('Take screenshot starts @', new Date().toISOString())
  if (process.argv[2] === undefined) throw new Error('missing videoPath') // eslint-disable-line no-magic-numbers
  if (process.argv[3] !== undefined) { takeScreenAt(process.argv[3]); return } // eslint-disable-line no-magic-numbers
  const lastInput = await fs.readFile(lastInputFile, 'utf8').catch(() => '60')
  ask.question(`  Please type the time in mmss or ss (enter to use "${lastInput}") : `, (time) => { takeScreenAt(time || lastInput) })
}

await init()
