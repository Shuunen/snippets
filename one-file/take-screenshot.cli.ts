import { exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'
import { getFfmpegCommand, getScreenshotFilename, Metadata, parseUserInput, parseVideoMetadata, Task } from './take-screenshot.utils.js' // js extension is required for ts-node to import it

const __filename = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(__filename)
const logFile = path.join(currentFolder, 'take-screenshot.log')
const lastInputFile = path.join(currentFolder, 'take-screenshot-last-input.txt')

const logClear = (): Promise<void> => fs.writeFile(logFile, '')

const logAdd = (...stuff: Array<string | Date>): Promise<void> => fs.appendFile(logFile, stuff.join(' ') + '\n')

const ask = createInterface({ input: process.stdin, output: process.stdout })

const shellCommand = async (cmd: string): Promise<string> => new Promise(resolve => {
  exec(cmd, (error, stdout: string, stderr: string) => {
    if (error) console.error(error)
    resolve(stdout || stderr)
  })
})

const deleteFile = (path: string): Promise<string | void> => fs.unlink(path).catch(() => 'ok')

const getVideoMetadata = async (filepath: string): Promise<Metadata> => {
  const output = await shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${filepath}" `)
  if (output[0] !== '{') throw new Error('ffprobe output should be JSON but got :' + output)
  const data = JSON.parse(output)
  const metadata = parseVideoMetadata(data)
  if (metadata.size === undefined || metadata.size === 0) metadata.size = await getFileSize(filepath)
  metadata.filepath = filepath
  return metadata
}

const getFileSize = async (filepath: string): Promise<number> => {
  const stats = await fs.stat(filepath)
  return stats.size
}

const asciiWelcome = (): void => {
  console.log(`
  ~|~ _ |  _   (~ _ _ _  _  _  _|_  _ _|_
   | (_||<(/_  _)(_| (/_(/_| |_\\| |(_) |
  `)
}

const getTask = (totalSeconds: number, metadata: Metadata): Task => {
  if (metadata.filepath === undefined) throw new Error('missing filepath')
  const screenName = getScreenshotFilename(totalSeconds, metadata)
  const screenPath = path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', 'Pictures', screenName)
  return { totalSeconds, videoPath: metadata.filepath, screenPath }
}

const getTasks = async (input: string): Promise<Task[]> => {
  const videoPath = process.argv[2]
  if (!videoPath) throw new Error('no video path')
  const videoName = path.basename(videoPath)
  const meta = await getVideoMetadata(videoPath)
  meta.title = meta.title.length > videoName.length ? meta.title : videoName
  await logAdd(`\n- videoPath : ${videoPath}\n- videoName : ${videoName}\n- title : ${meta.title}`)
  const targetsTotalSeconds = parseUserInput(input).map(({ minutes, seconds }) => minutes * 60 + seconds)
  return targetsTotalSeconds.map(totalSeconds => getTask(totalSeconds, meta))
}

const takeScreenAt = async (input: string): Promise<never> => {
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

const init = async (): Promise<void> => {
  asciiWelcome()
  await logClear()
  await logAdd('Take screenshot starts @', new Date())
  if (!process.argv[2]) throw new Error('missing videoPath')
  if (process.argv[3]) {
    takeScreenAt(process.argv[3])
    return
  }
  const lastInput = await fs.readFile(lastInputFile, 'utf8').catch(() => '60')
  ask.question(`  Please type the time in mmss or ss (enter to use "${lastInput}") : `, async (time: string) => await takeScreenAt(time || lastInput))
}

await init()
