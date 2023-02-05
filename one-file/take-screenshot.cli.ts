/* eslint-disable no-await-in-loop */
import { exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import { Nb } from 'shuutils'
import { fileURLToPath } from 'url'
import { getFfmpegCommand, getScreenshotFilename, parseUserInput, parseVideoMetadata, type FfProbeOutput, type Metadata, type Task } from './take-screenshot.utils.js' // js extension is required for ts-node to import it

const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const logFile = path.join(currentFolder, 'take-screenshot.log')
const lastInputFile = path.join(currentFolder, 'take-screenshot-last-input.txt')

async function logClear (): Promise<void> { await fs.writeFile(logFile, '') }

async function logAdd (...stuff: Date[] | string[]): Promise<void> { await fs.appendFile(logFile, `${stuff.join(' ')}\n`) }

const ask = createInterface({ input: process.stdin, output: process.stdout })

async function shellCommand (cmd: string): Promise<string> {
  // eslint-disable-next-line promise/avoid-new
  return await new Promise(resolve => {
    // eslint-disable-next-line security/detect-child-process
    exec(cmd, (error, stdout: string, stderr: string) => {
      if (error)
        console.error(error)
      resolve(stdout || stderr)
    })
  })
}

async function deleteFile (filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => 'ok')
}

async function getFileSize (filepath: string): Promise<number> {
  const stats = await fs.stat(filepath)
  return stats.size
}

async function getVideoMetadata (filepath: string): Promise<Metadata> {
  const output = await shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${filepath}" `)
  if (!output.startsWith('{')) throw new Error(`ffprobe output should be JSON but got :${output}`)
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const data = JSON.parse(output) as Partial<FfProbeOutput>
  const metadata = parseVideoMetadata(data)
  if (metadata.size === 0) metadata.size = await getFileSize(filepath)
  metadata.filepath = filepath
  return metadata
}

function asciiWelcome (): void {
  console.log(`
  ~|~ _ |  _   (~ _ _ _  _  _  _|_  _ _|_
   | (_||<(/_  _)(_| (/_(/_| |_\\| |(_) |
  `)
}

function getTask (totalSeconds: number, metadata: Metadata): Task {
  if (metadata.filepath === undefined)
    throw new Error('missing filepath')
  const screenName = getScreenshotFilename(totalSeconds, metadata)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions
  const screenPath = path.join(process.env.HOME || process.env.USERPROFILE || '', 'Pictures', screenName)
  return { totalSeconds, videoPath: metadata.filepath, screenPath }
}

async function getTasks (input: string): Promise<Task[]> {
  const videoPath = process.argv[Nb.Two]
  if (videoPath === undefined) throw new Error('no video path')
  const videoName = path.basename(videoPath)
  const meta = await getVideoMetadata(videoPath)
  if (meta.title.length <= videoName.length) meta.title = videoName
  await logAdd(`\n- videoPath : ${videoPath}\n- videoName : ${videoName}\n- title : ${meta.title}`)
  const targetsTotalSeconds = parseUserInput(input).map(({ minutes, seconds }) => minutes * Nb.SecondsInMinute + seconds)
  return targetsTotalSeconds.map(totalSeconds => getTask(totalSeconds, meta))
}

async function takeScreenAt (input: string): Promise<never> {
  await logAdd(`Input : "${input}"`)
  void fs.writeFile(lastInputFile, input)
  const tasks = await getTasks(input)
  for (const task of tasks) {
    const cmd = getFfmpegCommand(task)
    await deleteFile(task.screenPath)
    await logAdd('Command :', cmd)
    await logAdd(await shellCommand(cmd))
  }
  process.exit(0)
}

async function init (): Promise<void> {
  asciiWelcome()
  await logClear()
  await logAdd('Take screenshot starts @', new Date().toISOString())
  if (process.argv[Nb.Two] === undefined) throw new Error('missing videoPath')
  if (process.argv[Nb.Three] !== undefined) { void takeScreenAt(process.argv[Nb.Three]); return }
  const lastInput = await fs.readFile(lastInputFile, 'utf8').catch(() => '60')
  ask.question(`  Please type the time in mmss or ss (enter to use "${lastInput}") : `, (time: string) => { void takeScreenAt(time || lastInput) })
}

await init()

