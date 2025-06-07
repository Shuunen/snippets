/* c8 ignore start */
import { exec } from 'node:child_process'
import { readFile, readdir, renameSync, stat, writeFileSync } from 'node:fs'
import path from 'node:path'
import { inspect } from 'node:util'
import { blue, red, slugify } from 'shuutils'

// use me like :
//  node ~/Projects/github/snippets/one-file/check-videos.js "/u/A Voir/" --set-title
//  node ~/Projects/github/snippets/one-file/check-videos.js "/m/A Voir/Movies"

/**
 * @typedef {import('./take-screenshot.types').FfProbeOutput} FfProbeOutput
 * @typedef {import('./take-screenshot.types').FfProbeOutputStream} FfProbeOutputStream
 */

const { argv } = process
const expectedNbParameters = 2
if (argv.length <= expectedNbParameters) console.log('Targeting current folder, you can also specify a specific path, ex : check-videos.js "U:\\Movies\\" \n')
const videosPath = path.normalize(argv[expectedNbParameters] ?? process.cwd())
const willRename = argv.includes('--rename') || argv.includes('--fix')
const willProcessOnlyOne = argv.includes('--process-one') || argv.includes('--one')
const willSetTitle = argv.includes('--set-title') || argv.includes('--fix')
const willDryRun = argv.includes('--dry-run') || argv.includes('--dry')

let listing = 'name,title\n'

const regex = {
  cleanTitle: /[,:]/gu,
  cleanTitleSpaces: /\s+/gu,
  folderName: /\W([\s\w]+)\W?$/u,
  setVideoTitle: /\.[^.]+$/u,
  isVideo: /\.(?:avi|m4v|mkv|mp4|mpg|wmv)$/u,
  getReportValue: /\[(\d+)\]/u,
}

const utils = {
  /**
   *
   * @param title
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
   * @param {string} filepath
   * @returns {Promise<number>} size in mb
   */
  getFileSizeInMb: async filepath =>
    new Promise((resolve, reject) => {
      stat(filepath, (/** @type {Error|null} */ error, /** @type {{ size: number; }} */ stats) => {
        if (error) reject(error)
        else resolve(Math.round(stats.size / 1_000_000))
      })
    }),
  /**
   * Get the video metadata from a filepath
   * @param {string} filepath
   */
  getVideoMetadata: async filepath => {
    const output = await utils.shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${filepath}" `)
    if (!output.startsWith('{')) throw new Error(`ffprobe output should be JSON but got :${output}`)
    /** @type {FfProbeOutput} */
    const data = JSON.parse(output)
    // console.log(utils.prettyPrint(data))
    const media = data.format
    // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
    const video = data.streams?.find((/** @type {{ codec_type: string; }} */ stream) => stream.codec_type === 'video') ?? { avg_frame_rate: '', codec_name: '', codec_type: '', color_transfer: '', duration: '', height: 0, width: 0 }
    const title = utils.cleanTitle(media?.tags?.title)
    const extension = path.extname(filepath).slice(1)
    const filename = title.length > 0 ? `${title}.${extension}` : ''
    // biome-ignore lint/security/noGlobalEval: it's safe here
    const avgFrameRate = Number(eval(video.avg_frame_rate))
    // console.log(utils.prettyPrint(video))
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
  isHdrVideo: (/** @type {FfProbeOutputStream | undefined} */ video) => {
    if (typeof video?.codec_type === 'undefined') return false
    const hasPq = video.color_transfer === 'smpte2084'
    const hasHlg = video.color_transfer === 'arib-std-b67'
    const hasDolbyVision = video.side_data_list?.some(data => data.side_data_type === 'DOVI configuration record') ?? false
    const hasHdr10Plus = video.side_data_list?.some(data => data.side_data_type === 'HDR Dynamic Metadata SMPTE2094-40 (HDR10+)') ?? false
    return hasPq || hasHlg || hasDolbyVision || hasHdr10Plus
  },
  /**
   * List the files in a directory
   * @param {string} filepath The directory to list
   * @returns {Promise<string[]>}
   */
  listFiles: async filepath =>
    new Promise((resolve, reject) => {
      readdir(filepath, (/** @type {Error|null} */ error, /** @type {string[]} */ filenames) => {
        if (error) reject(error)
        else resolve(filenames)
      })
    }),
  /**
   * Display a pretty-printed JSON object
   * @param {{}} object
   */
  prettyPrint: object => inspect(object, { colors: true, depth: 2 }),
  /**
   * Read the contents of a file
   * @param {string} filepath
   * @returns {Promise<string>}
   */
  readFile: async filepath =>
    new Promise(resolve => {
      readFile(filepath, 'utf8', (/** @type {Error|null} */ error, /** @type {string} */ content) => {
        if (error) resolve('')
        else resolve(content)
      })
    }),
  /**
   * Set the title of a video in its metadata
   * @param {string} filepath The filepath of the video
   * @param {string} filename The filename of the video
   * @returns {Promise<void>}
   */
  setVideoTitle: async (filepath, filename) => {
    if (filepath.includes('.mp4') || filepath.includes('.avi')) return
    const title = utils.cleanTitle(filename.replace(regex.setVideoTitle, ''))
    if (willDryRun) console.log(`Would set title to ${blue(title)}\n`)
    else await utils.shellCommand(`mkvpropedit "${filepath}" -e info -s title="${title}"`)
  },
  /**
   * Execute a command and return the output
   * @param {string} cmd
   * @returns {Promise<string>}
   */
  shellCommand: async cmd =>
    new Promise(resolve => {
      exec(cmd, (/** @type {Error|null} */ error, /** @type {string} */ stdout, /** @type {string} */ stderr) => {
        if (error) console.error(error)
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
   * @type {Record<string, string[]>}
   */
  detected = {}
  /**
   * The files to check
   * @type {string[]}
   */
  files = []
  /**
   * @param {string} valueA
   * @param {string} valueB
   * @returns
   */
  byValueAsc(valueA, valueB) {
    return this.getReportValue(valueA) - this.getReportValue(valueB)
  }
  /**
   *
   */
  async check() {
    const total = this.files.length
    // console.log('in checkAll with a total of', total)
    for (let index = 0; index < total; index += 1) {
      const filename = this.files[index]
      if (filename === undefined) continue
      console.log(`checking file ${(String(index + 1)).padStart(String(total).length)} / ${total} : ${filename}`)
      await this.checkOne(filename)
    }
    const listingFilename = `.${slugify(utils.folderName(videosPath) || 'check')}-videos-listing.csv`
    const filePath = path.normalize(path.join(videosPath, listingFilename))
    writeFileSync(filePath, listing)
  }
  /**
   * Check one video
   * @param {string} filename
   * @returns {Promise<void>}
   */
  async checkOne(filename) {
    const filepath = path.join(videosPath, path.normalize(filename))
    const meta = await utils.getVideoMetadata(filepath)
    if (willSetTitle && filename !== meta.filename) await utils.setVideoTitle(filepath, filename.length > meta.filename.length ? filename : meta.filename)
    if (this.shouldRename(filename, meta.filename)) willDryRun ? console.log(`Would rename file to ${red(meta.filename)}\n`) : renameSync(filepath, path.join(videosPath, path.normalize(meta.filename)))
    listing += `${filename},${meta.title}\n`
    const entry = `${utils.ellipsis(filename, 50).padEnd(50)}  ${(String(meta.sizeGb)).padStart(4)} Gb  ${(meta.codec).padEnd(5)} ${(String(meta.height)).padStart(4)}p  ${(String(meta.bitrateKbps)).padStart(4)} kbps  ${(String(meta.fps)).padStart(2)} fps`
    if (meta.isDvdRip ? this.checkDvdRip(meta, entry) : this.checkBlurayRip(meta, entry)) return
    if (this.checkFps(meta, entry)) return
  }

  /**
   * Check DVD rip specific conditions
   * @param {any} meta - expects {height:number, bitrateKbps:number}
   * @param {string} entry
   * @returns {boolean} true if a problem was detected
   */
  checkDvdRip(meta, entry) {
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
   * @param {any} meta - expects {height:number, bitrateKbps:number, isHdr:boolean}
   * @param {string} entry
   * @returns {boolean} true if a problem was detected
   */
  checkBlurayRip(meta, entry) {
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
   * @param {any} meta - expects {fps:number}
   * @param {string} entry
   * @returns {boolean} true if a problem was detected
   */
  checkFps(meta, entry) {
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
   * @param {string} type The type of problem detected
   * @param {string} entry
   * @param {string|number} value
   */
  detect(type, entry, value) {
    this.detected[type] ??= []
    this.detected[type].push(`${entry}  [${value}]`)
  }
  /**
   *
   */
  async find() {
    console.log(`Scanning dir ${videosPath}`)
    const list = await utils.readFile(path.join(videosPath, '.check-videos-ignore'))
    const isIgnored = list.split('\n')
    for (const line of isIgnored) if (line.trim().length > 0 && !line.startsWith('//')) listing += `${line},\n`
    const files = await utils.listFiles(videosPath)
    this.files = files.filter(entry => !isIgnored.includes(entry) && regex.isVideo.test(entry))
    if (this.files.length === 0) throw new Error(`no files found with these extensions ${String(regex.isVideo)}`)
    console.log(this.files.length, 'files found\n')
    if (!willProcessOnlyOne || this.files.length === 0) return
    console.log('--process-one flag active : only one file will be processed\n')
    const [first] = this.files
    if (first === undefined) throw new Error('no files found')
    this.files = [first]
  }
  /**
   * @param {string} string
   * @returns {number}
   */
  getReportValue(string) {
    const matches = regex.getReportValue.exec(string) ?? []
    return matches[1] === undefined ? 0 : Number.parseInt(matches[1], 10)
  }
  /**
   *
   * @returns {void}
   */
  report() {
    const types = Object.keys(this.detected)
    if (types.length === 0) {
      console.log('\u001B[32m%s\u001B[0m', '\nAll checked files seems fine :)')
      return
    }
    let total = 0
    console.log('\u001B[1m%s\u001B[0m', '\nReport :')
    for (const type of types) {
      console.log('\u001B[100m%s\u001B[0m', `\n${type} :`)
      const videos = this.detected[type] ?? []
      for (const [index, file] of videos.sort((videoA, videoB) => this.byValueAsc(videoA, videoB)).entries()) {
        const isEven = !(index % 2)
        const line = ` - ${file}`
        total += 1
        if (isEven) console.log('\u001B[91m%s\u001B[0m', line)
        else console.log(line)
      }
    }
    console.log('')
    const line = ` ${total} files seems problematic `
    console.log(`╔${'═'.repeat(line.length)}╗`)
    console.log(`║${line}║`)
    console.log(`╚${'═'.repeat(line.length)}╝`)
  }
  /**
   * Detect if a video should be renamed
   * @param {string} actual The actual name of the video
   * @param {string} expected The expected name
   * @returns {boolean} true if the video should be renamed
   */
  shouldRename(actual = '', expected = '') {
    if (!willRename) return false
    if (expected === '') return false
    if (actual === expected) return false
    if (expected.length > actual.length) return true
    const diff = Math.abs(actual.length - expected.length)
    const toleratedDiff = Math.round(actual.length / 10)
    if (diff <= toleratedDiff) return true
    console.log(`Avoid renaming, too much diff between : \n - actual filename : ${actual} \n - expected filename : ${expected}`)
    return false
  }
  /**
   *
   */
  async start() {
    console.log('\nCheck Videos is starting !\n')
    await this.find()
    await this.check()
    this.report()
  }
}

const instance = new CheckVideos()
await instance.start()
