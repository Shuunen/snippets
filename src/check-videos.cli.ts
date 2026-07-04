/* v8 ignore start */
// oxlint-disable avoid-new, max-lines, no-eval, require-returns, no-magic-numbers, require-param-description
import { exec } from 'node:child_process'
import { readdir, readFile, renameSync, stat, writeFileSync } from 'node:fs'
import path from 'node:path'
import { blue, Logger, parseJson, red, slugify } from 'shuutils'
import type { FfProbeOutput, FfProbeOutputStream } from './take-screenshot.types'

// use me like :
//  bun ~/Projects/github/snippets/src/check-videos.cli.ts "/u/A Voir/" --set-title
//  bun ~/Projects/github/snippets/src/check-videos.cli.ts "/m/A Voir/Movies"

const { argv } = process
const expectedNbParameters = 2
const logger = new Logger()
if (argv.length <= expectedNbParameters) logger.info('Targeting current folder, you can also specify a specific path, ex : check-videos.js "U:\\Movies\\" \n')
const videosPath = path.normalize(argv[expectedNbParameters] ?? process.cwd())
const willRename = argv.includes('--rename') || argv.includes('--fix')
const willProcessOnlyOne = argv.includes('--process-one') || argv.includes('--one')
const willSetTitle = argv.includes('--set-title') || argv.includes('--fix')
const willDryRun = argv.includes('--dry-run') || argv.includes('--dry')

let listing = 'name,title\n'

const regex = {
  cleanTitle: /[,:]/gu,
  cleanTitleSpaces: /\s+/gu,
  folderName: /\W(?<name>[\s\w]+)\W?$/u,
  getReportValue: /\[(?<value>\d+)\]/u,
  isVideo: /\.(?:avi|m4v|mkv|mp4|mpg|wmv)$/u,
  setVideoTitle: /\.[^.]+$/u,
}

/**
 * Detect if a video should be renamed
 * @param actual The actual name of the video
 * @param expected The expected name
 * @returns true if the video should be renamed
 */
function shouldRename(actual = '', expected = '') {
  if (!willRename) return false
  if (expected === '') return false
  if (actual === expected) return false
  if (expected.length > actual.length) return true
  const diff = Math.abs(actual.length - expected.length)
  const toleratedDiff = Math.round(actual.length / 10)
  if (diff <= toleratedDiff) return true
  logger.info(`Avoid renaming, too much diff between : \n - actual filename : ${actual} \n - expected filename : ${expected}`)
  return false
}

/**
 * @param string
 * @returns the value extracted from the string
 */
function getReportValue(string: string) {
  const matches = regex.getReportValue.exec(string) ?? []
  return matches[1] === undefined ? 0 : Math.trunc(Number(matches[1]))
}

/**
 * @param valueA
 * @param valueB
 * @returns the difference between the two values
 */
function byValueAsc(valueA: string, valueB: string) {
  return getReportValue(valueA) - getReportValue(valueB)
}

const utils = {
  /**
   *
   * @param title
   * @returns the cleaned title
   */
  cleanTitle: (title = '') => title.replace('PSArips.com | ', '').replace(regex.cleanTitle, ' ').replace(regex.cleanTitleSpaces, ' ').trim(),
  /**
   *
   * @param string
   * @param length
   */
  ellipsis: (string = '', length = 0) => (string.length > length ? `${string.slice(0, Math.max(0, length - 3))}...` : string),
  /**
   *
   * @param filepath
   */
  folderName: (filepath = '') => regex.folderName.exec(filepath)?.[1] ?? '',
  /**
   * Get the size of a file in megabytes
   * @param filepath
   * @returns size in mb
   */
  getFileSizeInMb: (filepath: string): Promise<number> =>
    new Promise((resolve, reject) => {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      stat(filepath, (error: Error | null, stats: { size: number }) => {
        if (error) reject(error)
        else resolve(Math.round(stats.size / 1_000_000))
      })
    }),
  /**
   * Get the video metadata from a filepath
   * @param filepath
   */
  getVideoMetadata: async (filepath: string) => {
    const output = await utils.shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${filepath}" `)
    if (typeof output !== 'string') throw new Error('ffprobe output is not a string')
    if (!output.startsWith('{')) throw new Error(`ffprobe output should be JSON but got :${output}`)
    const result = parseJson<FfProbeOutput>(output)
    if (result.error) throw new Error(`ffprobe output is not valid JSON : ${result.error}`)
    // logger.info(utils.prettyPrint(data))
    const media = result.value.format
    const video = result.value.streams?.find((/** @type {{ codec_type: string; }} */ stream) => stream.codec_type === 'video') ?? { avg_frame_rate: '', codec_name: '', codec_type: '', color_transfer: '', duration: '', height: 0, width: 0 }
    const title = utils.cleanTitle(media?.tags?.title)
    const extension = path.extname(filepath).slice(1)
    const filename = title.length > 0 ? `${title}.${extension}` : ''
    const avgFrameRate = Number(eval(video.avg_frame_rate))
    // logger.info(utils.prettyPrint(video))
    return {
      bitrateKbps: media?.bit_rate === undefined ? 0 : Math.round(media.bit_rate / 1024),
      codec: video.codec_name.replace('video', '') || 'unknown codec',
      durationSeconds: media?.duration === undefined ? 0 : Math.round(media.duration),
      extension,
      filename,
      fps: video.avg_frame_rate ? Math.round(avgFrameRate) : 0,
      height: video.height,
      isDvdRip: title.toLowerCase().includes('dvdrip'),
      isHdr: utils.isHdrVideo(video),
      sizeGb: media?.size === undefined ? 0 : (Math.round(media.size / 100_000_000) / 10).toFixed(1),
      sizeMb: media?.size === undefined ? 0 : Math.round(media.size / 1_000_000),
      title,
      width: video.width,
    }
  },
  /**
   * Check if a video is HDR
   * @param video the video stream
   * @returns {boolean} true if the video is HDR
   */
  isHdrVideo: (video: FfProbeOutputStream | undefined) => {
    if (video?.codec_type === undefined) return false
    const hasPq = video.color_transfer === 'smpte2084'
    const hasHlg = video.color_transfer === 'arib-std-b67'
    const hasDolbyVision = video.side_data_list?.some(data => data.side_data_type === 'DOVI configuration record') ?? false
    const hasHdr10Plus = video.side_data_list?.some(data => data.side_data_type === 'HDR Dynamic Metadata SMPTE2094-40 (HDR10+)') ?? false
    return hasPq || hasHlg || hasDolbyVision || hasHdr10Plus
  },
  /**
   * List the files in a directory
   * @param filepath The directory to list
   * @returns the list of files in the directory
   */
  listFiles: (filepath: string): Promise<string[]> =>
    new Promise((resolve, reject) => {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      readdir(filepath, (/** @type {Error|null} */ error, /** @type {string[]} */ filenames) => {
        if (error) reject(error)
        else resolve(filenames)
      })
    }),
  /**
   * Read the contents of a file
   * @param filepath
   * @returns the contents of the file
   */
  readFile: (filepath: string): Promise<string> =>
    new Promise(resolve => {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      readFile(filepath, 'utf8', (/** @type {Error|null} */ error, /** @type {string} */ content) => {
        if (error) resolve('')
        else resolve(content)
      })
    }),
  /**
   * Set the title of a video in its metadata
   * @param filepath The filepath of the video
   * @param filename The filename of the video
   */
  setVideoTitle: async (filepath: string, filename: string) => {
    if (filepath.includes('.mp4') || filepath.includes('.avi')) return
    const title = utils.cleanTitle(filename.replace(regex.setVideoTitle, ''))
    if (willDryRun) logger.info(`Would set title to ${blue(title)}\n`)
    else await utils.shellCommand(`mkvpropedit "${filepath}" -e info -s title="${title}"`)
  },
  /**
   * Execute a command and return the output
   * @param cmd
   * @returns the output of the command
   */
  shellCommand: (cmd: string) =>
    new Promise(resolve => {
      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      exec(cmd, (/** @type {Error|null} */ error, /** @type {string} */ stdout, /** @type {string} */ stderr) => {
        if (error) logger.error(error)
        resolve(stdout || stderr)
      })
    }),
}

/**
 *
 */
class CheckVideos {
  /**
   * The incorrect videos detected
   */
  public detected: Record<string, string[]> = {}
  /**
   * The files to check
   */
  public files: string[] = []

  /**
   *
   */
  public async check() {
    const total = this.files.length
    // logger.info('in checkAll with a total of', total)
    for (let index = 0; index < total; index += 1) {
      const filename = this.files[index]
      if (filename === undefined) continue
      logger.info(`checking file ${String(index + 1).padStart(String(total).length)} / ${total} : ${filename}`)
      // oxlint-disable-next-line no-await-in-loop
      await this.checkOne(filename)
    }
    const listingFilename = `.${slugify(utils.folderName(videosPath) || 'check')}-videos-listing.csv`
    const filePath = path.normalize(path.join(videosPath, listingFilename))
    writeFileSync(filePath, listing)
  }
  /**
   * Check one video
   * @param filename
   */
  public async checkOne(filename: string) {
    const filepath = path.join(videosPath, path.normalize(filename))
    const meta = await utils.getVideoMetadata(filepath)
    if (willSetTitle && filename !== meta.filename) await utils.setVideoTitle(filepath, filename.length > meta.filename.length ? filename : meta.filename)
    if (shouldRename(filename, meta.filename))
      // oxlint-disable-next-line no-unused-expressions
      willDryRun ? logger.info(`Would rename file to ${red(meta.filename)}\n`) : renameSync(filepath, path.join(videosPath, path.normalize(meta.filename)))
    listing += `${filename},${meta.title}\n`
    const entry = `${utils.ellipsis(filename, 50).padEnd(50)}  ${String(meta.sizeGb).padStart(4)} Gb  ${meta.codec.padEnd(5)} ${String(meta.height).padStart(4)}p  ${String(meta.bitrateKbps).padStart(4)} kbps  ${String(meta.fps).padStart(2)} fps`
    if (meta.isDvdRip ? this.checkDvdRip(meta, entry) : this.checkBlurayRip(meta, entry)) return
    this.checkFps(meta, entry)
  }

  /**
   * Check DVD rip specific conditions
   * @param meta - expects {height:number, bitrateKbps:number}
   * @param entry
   * @returns true if a problem was detected
   */
  public checkDvdRip(meta: { height: number; bitrateKbps: number }, entry: string) {
    if (meta.height < 300) {
      this.detect('DvdRip under 300p', entry, meta.height)
      return true
    }
    if (meta.bitrateKbps < 1000) {
      this.detect('DvdRip with low bitrate', entry, meta.bitrateKbps)
      return true
    }
    if (meta.bitrateKbps > 2000) {
      this.detect('DvdRip with high bitrate', entry, meta.bitrateKbps)
      return true
    }
    return false
  }

  /**
   * Check Bluray rip specific conditions
   * @param meta - expects {height:number, bitrateKbps:number, isHdr:boolean}
   * @param entry
   * @returns true if a problem was detected
   */
  public checkBlurayRip(meta: { height: number; bitrateKbps: number; isHdr: boolean }, entry: string) {
    if (meta.height < 800) {
      this.detect('BlurayRip under 800p', entry, meta.height)
      return true
    }
    if (meta.bitrateKbps < 3000) {
      this.detect('BlurayRip with low bitrate', entry, meta.bitrateKbps)
      return true
    }
    if (meta.bitrateKbps > 10_000) {
      this.detect('BlurayRip with high bitrate', entry, meta.bitrateKbps)
      return true
    }
    if (!meta.isHdr) {
      this.detect('Not HDR', entry, 'SDR')
      return true
    }
    return false
  }

  /**
   * Check FPS conditions
   * @param meta - expects {fps:number}
   * @param entry the video entry
   * @returns true if a problem was detected
   */
  public checkFps(meta: { fps: number }, entry: string) {
    if (meta.fps < 24) {
      this.detect('Low fps', entry, meta.fps)
      return true
    }
    if (meta.fps > 60) {
      this.detect('High fps', entry, meta.fps)
      return true
    }
    return false
  }
  /**
   * Add a video to the list of detected videos
   * @param type The type of problem detected
   * @param entry
   * @param value
   */
  public detect(type: string, entry: string, value: string | number) {
    this.detected[type] ??= []
    this.detected[type].push(`${entry}  [${value}]`)
  }
  /**
   * Find the videos to check
   */
  public async find() {
    logger.info(`Scanning dir ${videosPath}`)
    const list = await utils.readFile(path.join(videosPath, '.check-videos-ignore'))
    const isIgnored = list.split('\n')
    for (const line of isIgnored) if (line.trim().length > 0 && !line.startsWith('//')) listing += `${line},\n`
    const files = await utils.listFiles(videosPath)
    this.files = files.filter(entry => !isIgnored.includes(entry) && regex.isVideo.test(entry))
    if (this.files.length === 0) throw new Error(`no files found with these extensions ${String(regex.isVideo)}`)
    logger.info(this.files.length, 'files found\n')
    if (!willProcessOnlyOne || this.files.length === 0) return
    logger.info('--process-one flag active : only one file will be processed\n')
    const [first] = this.files
    if (first === undefined) throw new Error('no files found')
    this.files = [first]
  }
  /**
   * Report the findings
   */
  public report() {
    const types = Object.keys(this.detected)
    if (types.length === 0) {
      logger.info('\u001B[32m%s\u001B[0m', '\nAll checked files seems fine :)')
      return
    }
    let total = 0
    logger.info('\u001B[1m%s\u001B[0m', '\nReport :')
    for (const type of types) {
      logger.info('\u001B[100m%s\u001B[0m', `\n${type} :`)
      const videos = this.detected[type] ?? []
      for (const [index, file] of videos.toSorted((videoA, videoB) => byValueAsc(videoA, videoB)).entries()) {
        const isEven = !(index % 2)
        const line = ` - ${file}`
        total += 1
        if (isEven) logger.info('\u001B[91m%s\u001B[0m', line)
        else logger.info(line)
      }
    }
    logger.info('')
    const line = ` ${total} files seems problematic `
    logger.info(`╔${'═'.repeat(line.length)}╗`)
    logger.info(`║${line}║`)
    logger.info(`╚${'═'.repeat(line.length)}╝`)
  }

  /**
   *
   */
  public async start() {
    logger.info('\nCheck Videos is starting !\n')
    await this.find()
    await this.check()
    this.report()
  }
}

const instance = new CheckVideos()
await instance.start()
