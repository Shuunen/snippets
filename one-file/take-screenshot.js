const exec = require('child_process').exec
const fs = require('fs').promises
const path = require('path')
const ask = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
})

const shellCommand = async (cmd) => new Promise((resolve) => {
  exec(cmd, (error, stdout, stderr) => {
    if (error) console.error(error)
    resolve(stdout || stderr)
  })
})
const deleteFile = path => fs.unlink(path).catch(() => 'ok')
const getFileSizeInGb = async (path) => {
  const results = await fs.stat(path)
  return (Math.round(results.size / 100000000)) / 10
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
  input = input + ''
  const seconds = Number.parseInt(input.slice(-2))
  const minutes = Number.parseInt(input.slice(0, -2))
  const totalSeconds = minutes * 60 + seconds
  const time = `${(minutes > 0 ? `${minutes}m` : '') + seconds}s`
  const videoPath = process.argv[2]
  const videoName = path.basename(videoPath)
  const videoSize = await getFileSizeInGb(videoPath)
  const size = `${String(videoSize).replace('.', ',')}go`
  const screenName = `${videoName} ${time} ${size}.jpg`
  const screenPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Pictures', screenName)
  return { totalSeconds, videoPath, screenPath }
}

const takeScreenAt = async (input) => {
  const { totalSeconds, videoPath, screenPath } = await getVariables(input)
  if (!totalSeconds) throw new Error('failed to process variables')
  const cmd = `ffmpeg -ss ${totalSeconds} -i "${videoPath}" -frames:v 1 -q:v 1 "${screenPath}"`
  await deleteFile(screenPath)
  await logAdd('Command :', cmd)
  await logAdd(await shellCommand(cmd))
  process.exit(0) // eslint-disable-line unicorn/no-process-exit
}

const init = async () => {
  asciiWelcome()
  await logClear()
  await logAdd('Take screenshot starts @ ', new Date())
  if (!process.argv[2]) throw new Error('missing videoPath')
  // return takeScreenAt(4710)
  ask.question('  Please type the time in mmss or ss : ', time => takeScreenAt(time))
}

init().catch(error => console.error(error))
