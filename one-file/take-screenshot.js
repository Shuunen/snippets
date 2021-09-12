import { exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const ask = createInterface({ input: process.stdin, output: process.stdout })

const shellCommand = async cmd => new Promise(resolve => {
  exec(cmd, (error, stdout, stderr) => {
    if (error) console.error(error)
    resolve(stdout || stderr)
  })
})

const deleteFile = path => fs.unlink(path).catch(() => 'ok')

const getVideoMetadata = async path => {
  const output = await shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${path}" `)
  if (output[0] !== '{') throw new Error('ffprobe output should be JSON but got :' + output)
  const data = JSON.parse(output)
  const media = data.format || {}
  const title = (media.tags && media.tags.title) || ''
  const size = (media.size > 0 || media.size.length > 0) ? media.size : getFileSize(path)
  return { title, size }
}

const getFileSize = async path => (await fs.stat(path)).size

const readableSize = size => {
  let unit = 'go'
  let nb = (size / 1024 / 1024 / 1024).toFixed(1)
  if (nb[0] === '0') {
    unit = 'mo'
    nb = String(Math.round(size / 1024 / 1024))
  }
  return nb.replace('.', ',') + unit
}

const currentFolder = path.dirname(fileURLToPath(import.meta.url))
const logFile = path.join(currentFolder, 'take-screenshot.log')
const modulos = [5, 4, 3, 2, 1]
const logClear = () => fs.writeFile(logFile, '')
const logAdd = (...stuff) => fs.appendFile(logFile, stuff.join(' ') + '\n')

const asciiWelcome = () => {
  console.log(`
  ~|~ _ |  _   (~ _ _ _  _  _  _|_  _ _|_
   | (_||<(/_  _)(_| (/_(/_| |_\\| |(_) |
  `)
}

const getTask = (totalSeconds, title, size, videoPath) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const timeHuman = `${(minutes > 0 ? `${minutes}m` : '') + seconds}s`
  const screenName = `${title.replace(/\./g, ' ')} ${timeHuman} ${size}.jpg`.replace(/\s?["*/:<>?\\|]+\s?/g, ' ').replace(/\s+/g, ' ') // replace un-authorized characters in filename
  const screenPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Pictures', screenName)
  return { totalSeconds, videoPath, screenPath }
}

const getTasks = async input => {
  const { a, b, modulo = '' } = String(input).match(/(?<a>\d{1,2})(?<b>\d{1,2})?(?<modulo>[+-]{1,2})?/).groups
  const seconds = Number.parseInt(b || a, 10)
  const minutes = Number.parseInt(a, 10)
  if (modulo) console.log('detected modulo :', modulo)
  const videoPath = process.argv[2]
  const videoName = path.basename(videoPath)
  const meta = await getVideoMetadata(videoPath)
  const title = meta.title.length > videoName.length ? meta.title : videoName
  const size = readableSize(meta.size)
  await logAdd(`- minutes : ${minutes}\n- seconds : ${seconds}\n- modulo : ${modulo}\n- videoPath : ${videoPath}\n- videoName : ${videoName}\n- title : ${title}\n- size : ${size}`)
  const tasks = []
  const totalSeconds = (minutes * 60) + seconds
  if (modulo.includes('-')) modulos.forEach(m => tasks.push(totalSeconds - m))
  tasks.push(totalSeconds)
  if (modulo.includes('+')) modulos.sort().forEach(m => tasks.push(totalSeconds + m))
  await logAdd(`- tasks (seconds) : ${tasks.toString()}`)
  return tasks.map(tSecs => getTask(tSecs, title, size, videoPath))
}

const takeScreenAt = async input => {
  const tasks = await getTasks(input).catch(error => console.error(error))
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
  if (process.argv[3]) return takeScreenAt(process.argv[3])
  ask.question('  Please type the time in mmss or ss : ', time => takeScreenAt(time))
}

init().catch(error => console.error(error))
