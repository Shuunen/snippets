/* c8 ignore start */
/* eslint-disable no-unused-expressions */
/* eslint-disable max-statements */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable prefer-named-capture-group */
/* eslint-disable regexp/prefer-named-capture-group */
/* eslint-disable regexp/no-super-linear-move */
/* eslint-disable no-eval */
/* eslint-disable security/detect-eval-with-expression */
/* eslint-disable no-magic-numbers */
/* eslint-disable promise/avoid-new */
/* eslint-disable security/detect-child-process */
import { exec } from 'node:child_process'
import { readdir, readFile, renameSync, stat, writeFileSync } from 'node:fs'
import path from 'node:path'
import { blue, red, slugify } from 'shuutils'
import { inspect } from 'node:util'

// use me like : node ~/Projects/github/snippets/one-file/check-videos.js "/u/A Voir/" --set-title

const { argv } = process
const expectedNbParameters = 2
if (argv.length <= expectedNbParameters) console.log('Targeting current folder, you can also specify a specific path, ex : check-videos.js "U:\\Movies\\" \n')
const videosPath = path.normalize(argv[expectedNbParameters] || process.cwd())
const willRename = argv.includes('--rename') || argv.includes('--fix')
const willProcessOnlyOne = argv.includes('--process-one') || argv.includes('--one')
const willSetTitle = argv.includes('--set-title') || argv.includes('--fix')
const willDryRun = argv.includes('--dry-run') || argv.includes('--dry')

let listing = 'name,title\n'

const utils = {
  cleanTitle: (title = '') => title.replace('PSArips.com | ', '').replace(/[,:]/gu, ' ').replace(/\s+/gu, ' ').trim(),
  ellipsis: (string = '', length = 0) => string.length > length ? (`${string.slice(0, Math.max(0, length - 3))}...`) : string,
  folderName: (filepath = '') => /\W([\s\w]+)\W?$/u.exec(filepath)?.[1] || '',
  /**
   * Get the size of a file in megabytes
   * @param {string} filepath
   * @returns {Promise<number>}
   */
  getFileSizeInMb: async filepath => await new Promise((resolve, reject) => {
    stat(filepath, (/** @type {Error|null} */ error, /** @type {{ size: number; }} */ stats) => { error ? reject(error) : resolve(Math.round(stats.size / 1_000_000)) })
  }),
  /**
   * Get the video metadata from a filepath
   * @param {string} filepath
   * @returns {Promise<{bitrateKbps: number; codec: any; durationSeconds: number; extension: any; filename: string; fps: number; height: number; isDvdRip: any; sizeGb: string | number; sizeMb: number; title: any; width: number; }>}
   */
  getVideoMetadata: async filepath => {
    const output = await utils.shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${filepath}" `)
    if (!output.startsWith('{')) throw new Error(`ffprobe output should be JSON but got :${output}`)
    const data = JSON.parse(output)
    // console.log(utils.prettyPrint(data))
    const media = data.format || {}
    const video = data.streams.find((/** @type {{ codec_type: string; }} */ stream) => stream.codec_type === 'video') || {}
    const title = utils.cleanTitle(media.tags?.title)
    const extension = path.extname(filepath).slice(1)
    const filename = title.length > 0 ? `${title}.${extension}` : ''
    // console.log(utils.prettyPrint(video))
    return {
      bitrateKbps: media.bit_rate ? Math.round(media.bit_rate / 1024) : 0,
      codec: video.codec_name.replace('video', '') || 'unknown codec',
      durationSeconds: media.duration ? Math.round(media.duration) : 0,
      extension,
      filename,
      fps: video.avg_frame_rate ? Math.round(eval(video.avg_frame_rate)) : 0,
      height: Number.parseInt(video.height || 0, 10),
      isDvdRip: title.toLowerCase().includes('dvdrip'),
      sizeGb: media.size > 0 ? (Math.round(media.size / 100_000_000) / 10).toFixed(1) : 0,
      sizeMb: media.size > 0 ? Math.round(media.size / 1_000_000) : 0,
      title,
      width: Number.parseInt(video.width || 0, 10),
    }
  },
  /**
   * List the files in a directory
   * @param {string} filepath The directory to list
   * @returns {Promise<string[]>}
   */
  listFiles: async filepath => await new Promise((resolve, reject) => {
    readdir(filepath, (/** @type {Error|null} */ error, /** @type {string[]} */ filenames) => { error ? reject(error) : resolve(filenames) })
  }),
  /**
   * Display a pretty-printed JSON object
   * @param {{}} object
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  prettyPrint: object => inspect(object, { colors: true, depth: 2 }),
  /**
   * Read the contents of a file
   * @param {string} filepath
   * @returns
   */
  readFile: async filepath => await new Promise(resolve => {
    readFile(filepath, 'utf8', (/** @type {Error|null} */ error, /** @type {string} */ content) => { error ? resolve('') : resolve(content) })
  }),
  /**
   * Set the title of a video in its metadata
   * @param {string} filepath The filepath of the video
   * @param {string} filename The filename of the video
   * @returns {Promise<void>}
   */
  setVideoTitle: async (filepath, filename) => {
    if (filepath.includes('.mp4') || filepath.includes('.avi')) return
    const title = utils.cleanTitle(filename.replace(/\.[^.]+$/u, ''))
    if (willDryRun) console.log(`Would set title to ${blue(title)}\n`)
    else await utils.shellCommand(`mkvpropedit "${filepath}" -e info -s title="${title}"`)
  },
  /**
   * Execute a command and return the output
   * @param {string} cmd
   * @returns {Promise<string>}
   */
  shellCommand: async cmd => await new Promise(resolve => {
    exec(cmd, (/** @type {Error|null} */ error, /** @type {string} */ stdout, /** @type {string} */ stderr) => {
      if (error) console.error(error)
      resolve(stdout || stderr)
    })
  }),
}

// eslint-disable-next-line no-restricted-syntax
class CheckVideos {
  /**
   * The files to check
   * @type {string[]}
   */
  files = []
  /**
   * The incorrect videos detected
   * @type {Record<string, string[]>}
   */
  detected = {}
  /**
   * @param {string} string
   * @returns {number}
   */
  getReportValue (string) {
    const matches = string.match(/\[(\d+)\]/u) || []
    return matches[1] ? Number.parseInt(matches[1], 10) : 0
  }
  /**
   * @param {string} valueA
   * @param {string} valueB
   * @returns
   */
  byValueAsc (valueA, valueB) {
    return this.getReportValue(valueA) - this.getReportValue(valueB)
  }
  /**
   *
   * @returns {void}
   */
  report () {
    const types = Object.keys(this.detected)
    if (types.length === 0) { console.log('\u001B[32m%s\u001B[0m', '\nAll checked files seems fine :)'); return }
    let total = 0
    console.log('\u001B[1m%s\u001B[0m', '\nReport :')
    for (const type of types) {
      console.log('\u001B[100m%s\u001B[0m', `\n${type} :`)
      const videos = this.detected[type] || []
      // eslint-disable-next-line etc/no-assign-mutated-array
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
   * Add a video to the list of detected videos
   * @param {string} type The type of problem detected
   * @param {string} entry
   * @param {string|number} value
   */
  detect (type, entry, value) {
    if (!this.detected[type]) this.detected[type] = []
    this.detected[type]?.push(`${entry}  [${value}]`)
  }
  /**
   * Detect if a video should be renamed
   * @param {string} actual The actual name of the video
   * @param {string} expected The expected name
   * @returns {boolean} true if the video should be renamed
   */
  shouldRename (actual = '', expected = '') {
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
  async start () {
    console.log('\nCheck Videos is starting !\n')
    await this.find()
    await this.check()
    this.report()
  }
  async find () {
    console.log(`Scanning dir ${videosPath}`)
    const isVideo = /\.(?:avi|m4v|mkv|mp4|mpg|wmv)$/u
    const list = await utils.readFile(path.join(videosPath, '.check-videos-ignore'))
    const isIgnored = list.split('\n')
    // eslint-disable-next-line unicorn/no-array-for-each
    isIgnored.forEach((line = '') => {
      if (line.trim().length > 0 && !line.startsWith('//')) listing += `${line},\n`
    })
    const files = await utils.listFiles(videosPath)
    this.files = files.filter(entry => (!isIgnored.includes(entry) && isVideo.test(entry)))
    if (this.files.length === 0) throw new Error(`no files found with these extensions ${String(isVideo)}`)
    console.log(this.files.length, 'files found\n')
    if (!willProcessOnlyOne || this.files.length === 0) return
    console.log('--process-one flag active : only one file will be processed\n')
    const [first] = this.files
    if (!first) throw new Error('no files found')
    this.files = [first]
  }
  async check () {
    const total = this.files.length
    // console.log('in checkAll with a total of', total)
    for (let index = 0; index < total; index += 1) {
      const filename = this.files[index]
      if (!filename) continue
      console.log(`checking file ${(String(index + 1)).padStart((String(total)).length)} / ${total} : ${filename}`)
      // eslint-disable-next-line no-await-in-loop
      await this.checkOne(filename)
    }
    const listingFilename = `.${slugify(utils.folderName(videosPath) || 'check')}-videos-listing.csv`
    writeFileSync(path.join(videosPath, listingFilename), listing)
  }
  /**
   * Check one video
   * @param {string} filename
   * @returns {Promise<void>}
   */
  async checkOne (filename) {
    const filepath = path.join(videosPath, filename)
    const meta = await utils.getVideoMetadata(filepath)
    if (willSetTitle && filename !== meta.filename) await utils.setVideoTitle(filepath, filename.length > meta.filename.length ? filename : meta.filename)
    if (this.shouldRename(filename, meta.filename)) willDryRun ? console.log(`Would rename file to ${red(meta.filename)}\n`) : renameSync(filepath, path.join(videosPath, meta.filename))
    listing += `${filename},${meta.title}\n`
    const entry = `${utils.ellipsis(filename, 50).padEnd(50)}  ${(String(meta.sizeGb)).padStart(4)} Gb  ${(meta.codec).padEnd(5)} ${(String(meta.height)).padStart(4)}p  ${(String(meta.bitrateKbps)).padStart(4)} kbps  ${(String(meta.fps)).padStart(2)} fps`
    if (meta.isDvdRip) {
      if (meta.height < 300) { this.detect('DvdRip under 300p', entry, meta.height); return }
      if (meta.bitrateKbps < 1000) { this.detect('DvdRip with low bitrate', entry, meta.bitrateKbps); return }
      if (meta.bitrateKbps > 2000) { this.detect('DvdRip with high bitrate', entry, meta.bitrateKbps); return }
    } else {
      if (meta.height < 800) { this.detect('BlurayRip under 800p', entry, meta.height); return }
      if (meta.bitrateKbps < 2100) { this.detect('BlurayRip with low bitrate', entry, meta.bitrateKbps); return }
      if (meta.bitrateKbps > 10_000) { this.detect('BlurayRip with high bitrate', entry, meta.bitrateKbps); return }
    }
    if (meta.fps < 24) { this.detect('Low fps', entry, meta.fps); return }
    if (meta.fps > 60) this.detect('High fps', entry, meta.fps)
  }
}

const instance = new CheckVideos()
await instance.start()
