#!/usr/bin/env node
import { exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const ask = createInterface({ input: process.stdin, output: process.stdout })

const shellCommand = async (/** @type {string} */ cmd) => new Promise(resolve => {
  exec(cmd, (/** @type {Error|null} */ error, /** @type {string} */ stdout, /** @type {string} */ stderr) => {
    if (error) console.error(error)
    resolve(stdout || stderr)
  })
})

const deleteFile = (/** @type {string} */ path) => fs.unlink(path).catch(() => 'ok')

const getVideoMetadata = async (/** @type {string} */ path) => {
  const output = await shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${path}" `)
  if (output[0] !== '{') throw new Error('ffprobe output should be JSON but got :' + output)
  const data = JSON.parse(output)
  if (!data.streams) return { title: '', duration: 0, size: 0, height: 0 }
  const video = data.streams.find((/** @type {{ codec_type: string; }} */ stream) => stream.codec_type === 'video')
  const height = video.height
  const media = data.format || {}
  const duration = media.duration
  const title = (media.tags && media.tags.title) || ''
  const size = (media.size !== undefined && (media.size > 0 || media.size.length > 0)) ? media.size : getFileSize(path)
  return { title, size, height, duration }
}

const getFileSize = async (/** @type {string} */ path) => {
  const stats = await fs.stat(path)
  return stats.size
}

const readableSize = (/** @type {number} */ size) => {
  let unit = 'go'
  let nb = (size / 1024 / 1024 / 1024).toFixed(1)
  if (nb[0] === '0') {
    unit = 'mo'
    nb = String(Math.round(size / 1024 / 1024))
  }
  return nb.replace('.', ',') + unit
}

const readableDuration = (/** @type {number} */ seconds) => new Date(seconds * 1000).toISOString().slice(11, 19).replace(':', 'h').replace(':', 'm') + 's'

const readableHeight = (/** @type {number} */ height) => height ? `${height}p` : ''

// @ts-ignore
const currentFolder = path.dirname(fileURLToPath(import.meta.url))
const logFile = path.join(currentFolder, 'take-screenshot.log')
const modulos = [5, 4, 3, 2, 1]
const logClear = () => fs.writeFile(logFile, '')
const logAdd = (/** @type {(string | Date)[]} */ ...stuff) => fs.appendFile(logFile, stuff.join(' ') + '\n')

const asciiWelcome = () => {
  console.log(`
  ~|~ _ |  _   (~ _ _ _  _  _  _|_  _ _|_
   | (_||<(/_  _)(_| (/_(/_| |_\\| |(_) |
  `)
}

// eslint-disable-next-line unicorn/no-object-as-default-parameter
const getTask = (/** @type {number} */ totalSeconds, /** @type {string} */ title, /** @type {any} */ videoPath, meta = { size: 0, height: 0, duration: 0 }) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const timeHuman = `${(minutes > 0 ? `${minutes}m` : '') + seconds}s`.trim()
  const screenName = `${title.replace(/\./g, ' ')} ${timeHuman} ${readableSize(meta.size)} ${readableHeight(meta.height)} ${readableDuration(meta.duration)}.jpg`.replace(/\s?["*/:<>?\\|]+\s?/g, ' ').replace(/\s+/g, ' ') // replace un-authorized characters in filename
  const screenPath = path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', 'Pictures', screenName)
  return { totalSeconds, videoPath, screenPath }
}

/**
 * @param {string} input
 * @returns {Promise<{ totalSeconds: number; videoPath: string; screenPath: string; }[]>}
 */
const getTasks = async (input) => {
  // @ts-ignore
  const { a, b, modulo = '' } = String(input).match(/(?<a>\d{1,2})(?<b>\d{1,2})?(?<modulo>[+-]{1,2})?/).groups
  const seconds = Number.parseInt(b || a, 10)
  const minutes = b === undefined ? 0 : Number.parseInt(a, 10)
  const videoPath = process.argv[2]
  if(!videoPath) throw new Error('no video path')
  const videoName = path.basename(videoPath)
  const meta = await getVideoMetadata(videoPath)
  const title = meta.title.length > videoName.length ? meta.title : videoName
  await logAdd(`- minutes : ${minutes}\n- seconds : ${seconds}\n- modulo : ${modulo}\n- videoPath : ${videoPath}\n- videoName : ${videoName}\n- title : ${title}`)
  const tasks = []
  const totalSeconds = (minutes * 60) + seconds
  if (modulo.includes('-')) modulos.forEach(m => tasks.push(totalSeconds - m))
  tasks.push(totalSeconds)
  if (modulo.includes('+')) modulos.sort().forEach(m => tasks.push(totalSeconds + m))
  await logAdd(`- tasks (seconds) : ${tasks.toString()}`)
  return tasks.map(tSecs => getTask(tSecs, title, videoPath, meta))
}

const takeScreenAt = async (/** @type {string} */ input) => {
  const tasks = await getTasks(input)
  for (let task of tasks) {
    const { totalSeconds, videoPath, screenPath } = task
    if (!totalSeconds) throw new Error('failed to process variables')
    const cmd = `ffmpeg -ss ${totalSeconds} -i "${videoPath}" -frames:v 1 -q:v 1 "${screenPath}"`
    await deleteFile(screenPath)
    await logAdd('Command :', cmd)
    await logAdd(await shellCommand(cmd))
  }
  process.exit(0)
}

const init = async () => {
  asciiWelcome()
  await logClear()
  await logAdd('Take screenshot starts @', new Date())
  if (!process.argv[2]) throw new Error('missing videoPath')
  if (process.argv[3]) {
    takeScreenAt(process.argv[3])
    return
  }
  ask.question('  Please type the time in mmss or ss : ', (/** @type {any} */ time) => takeScreenAt(time))
}

// @ts-ignore
await init().catch(error => console.error(error))
