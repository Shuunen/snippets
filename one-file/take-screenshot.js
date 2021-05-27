const exec = require('child_process').exec
const fs = require('fs').promises
const path = require('path')
const ask = require('readline').createInterface({ input: process.stdin, output: process.stdout })

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
  const size = media.size || getFileSize(path)
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

const logFile = path.join(__dirname, 'take-screenshot.log')
const logClear = () => fs.writeFile(logFile, '')
const logAdd = (...stuff) => fs.appendFile(logFile, stuff.join(' ') + '\n')

const asciiWelcome = () => {
  console.log(`
  ~|~ _ |  _   (~ _ _ _  _  _  _|_  _ _|_
   | (_||<(/_  _)(_| (/_(/_| |_\\| |(_) |
  `)
}

const getVariables = async input => {
  input = String(input)
  const seconds = Number.parseInt(input.slice(-2), 10)
  const minutes = Number.parseInt(input.slice(0, -2), 10) || 0
  const totalSeconds = (minutes * 60) + seconds
  const time = `${(minutes > 0 ? `${minutes}m` : '') + seconds}s`
  const videoPath = process.argv[2]
  const videoName = path.basename(videoPath)
  const meta = await getVideoMetadata(videoPath)
  const title = meta.title.length > videoName.length ? meta.title : videoName
  const size = readableSize(meta.size)
  const screenName = `${title} ${time} ${size}.jpg`.replace(/\s?[|\/\\*<>:?"]+\s?/g, ' ') // replace un-authorized characters in filename
  const screenPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Pictures', screenName)
  await logAdd(`- seconds : ${seconds}\n- minutes : ${minutes}\n- totalSeconds : ${totalSeconds}\n- time : ${time}\n- videoPath : ${videoPath}\n- videoName : ${videoName}`)
  await logAdd(`- title : ${title}\n- meta.size : ${meta.size}\n- size : ${size}\n- screenName : ${screenName}\n- screenPath : ${screenPath} `)
  return { totalSeconds, videoPath, screenPath }
}

const takeScreenAt = async input => {
  const { totalSeconds, videoPath, screenPath } = await getVariables(input).catch(error => console.error(error))
  if (!totalSeconds) throw new Error('failed to process variables')
  const cmd = `ffmpeg -ss ${totalSeconds} -i "${videoPath}" -frames:v 1 -q:v 1 "${screenPath}"`
  await deleteFile(screenPath)
  await logAdd('Command :', cmd)
  await logAdd(await shellCommand(cmd))
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
