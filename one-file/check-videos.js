#!/usr/bin/env node
import { exec } from 'child_process'
import { readdir, readFile, renameSync, stat, writeFileSync } from 'fs'
import path from 'path'
import { inspect } from 'util'

let listing = 'name,title\n'

const utils = {
  shellCommand: async cmd => new Promise(resolve => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) console.error(error)
      resolve(stdout || stderr)
    })
  }),
  getFileSizeInMb: async filepath => new Promise((resolve, reject) => {
    stat(filepath, (error, stats) => (error ? reject(error) : resolve(Math.round(stats.size / 1_000_000))))
  }),
  getVideoMetadata: async filepath => {
    const output = await utils.shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${filepath}" `)
    if (output[0] !== '{') throw new Error('ffprobe output should be JSON but got :' + output)
    const data = JSON.parse(output)
    // console.log(utils.prettyPrint(data))
    const media = data.format || {}
    const video = data.streams.find(s => s.codec_type === 'video') || {}
    const title = (media.tags && media.tags.title) || ''
    const extension = path.extname(filepath).slice(1)
    const filename = title.length > 0 ? `${title}.${extension}` : ''
    // console.log(utils.prettyPrint(video))
    return {
      bitrateKbps: media.bit_rate ? Math.round(media.bit_rate / 1024) : 0,
      codec: video.codec_name || 'unknown codec',
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
  setVideoTitle: async (filepath, filename) => {
    if (filepath.includes('.mp4') || filepath.includes('.avi')) return
    const title = filename.replace(/\.[^.]+$/, '')
    return utils.shellCommand(`mkvpropedit "${filepath}" -e info -s title="${title}"`)
  },
  ellipsis: (string = '', length = 0) => string.length > length ? (string.slice(0, Math.max(0, length - 3)) + '...') : string,
  listFiles: async filepath => new Promise((resolve, reject) => {
    readdir(filepath, (error, filenames) => (error ? reject(error) : resolve(filenames)))
  }),
  prettyPrint: object => inspect(object, { depth: 2, colors: true }),
  readFile: async filepath => new Promise(resolve => {
    readFile(filepath, 'utf8', (error, content) => (error ? resolve('') : resolve(content)))
  }),
}

class CheckVideos {
  constructor () {
    this.files = []
    this.detected = {}
    this.videosPath = ''
    this.rename = false
    this.setTitle = false
    this.processOne = false
  }

  start () {
    console.log('\nCheck Videos is starting !\n')
    this.args()
      .then(() => this.find())
      .then(() => this.check())
      .then(() => this.report())
      .catch(error => console.error(error))
  }

  async args () {
    if (process.argv.length <= 2) console.log('Targeting current folder, you can also specify a specific path, ex : check-videos.js "U:\\Movies\\" \n')
    this.videosPath = path.normalize(process.argv[2] || process.cwd())
    this.rename = process.argv.includes('--rename')
    this.processOne = process.argv.includes('--process-one')
    this.setTitle = process.argv.includes('--set-title')
  }

  async find () {
    console.log(`Scanning dir ${this.videosPath}`)
    const isVideo = /\.(mp4|mkv|avi|wmv|m4v|mpg)$/
    const list = await utils.readFile(path.join(this.videosPath, '.check-videos-ignore'))
    const isIgnored = list.split('\n')
    isIgnored.forEach((line = '') => {
      if (line.trim().length > 0 && !line.startsWith('//')) listing += `${line},\n`
    })
    const files = await utils.listFiles(this.videosPath)
    this.files = files.filter(entry => (!isIgnored.includes(entry) && isVideo.test(entry)))
    if (this.files.length === 0) throw new Error('no files found with these extensions ' + isVideo)
    console.log(this.files.length, 'files found\n')
    if (!this.processOne) return
    console.log('--process-one flag active : only one file will be processed\n')
    this.files = [this.files[0]]
  }

  async check () {
    const total = this.files.length
    // console.log('in checkAll with a total of', total)
    for (let index = 0; index < total; index++) {
      const filename = this.files[index]
      console.log(`checking file ${(String(index + 1)).padStart((String(total)).length)} / ${total} : ${filename}`)
      await this.checkOne(filename)
    }
    writeFileSync(path.join(this.videosPath, '.check-videos-listing.csv'), listing)
  }

  getReportValue (string) {
    return Number.parseInt(string.match(/\[(\d+)]/)[1], 10)
  }

  byValueAsc (a, b) {
    return this.getReportValue(a) - this.getReportValue(b)
  }

  async report () {
    const types = Object.keys(this.detected)
    if (types.length === 0) return console.log('\u001B[32m%s\u001B[0m', '\nAll checked files seems fine :)')
    let total = 0
    console.log('\u001B[1m%s\u001B[0m', '\nReport :')
    types.forEach(type => {
      console.log('\u001B[100m%s\u001B[0m', `\n${type} :`)
      this.detected[type].sort((a, b) => this.byValueAsc(a, b)).forEach((file, index) => {
        const even = (index % 2) === 0
        const line = ` - ${file}`
        total++
        if (even) return console.log('\u001B[91m%s\u001B[0m', line)
        return console.log(line)
      })
    })
    console.log('')
    const line = ` ${total} files seems problematic `
    console.log('╔' + '═'.repeat(line.length) + '╗')
    console.log('║' + line + '║')
    console.log('╚' + '═'.repeat(line.length) + '╝')
  }

  detect (type, entry, value) {
    if (!this.detected[type]) this.detected[type] = []
    this.detected[type].push(`${entry}  [${value}]`)
  }

  shouldRename (actual = '', expected = '') {
    if (!this.rename) return false
    if (expected === '') return false
    if (expected.length > actual.length) return true
    const diff = Math.abs(actual.length - expected.length)
    const toleratedDiff = Math.round(actual.length / 10)
    if (diff <= toleratedDiff) return true
    console.log(`Avoid renaming, too much diff between : \n - actual filename : ${actual} \n - expected filename : ${expected}`)
  }

  async checkOne (filename) {
    const filepath = path.join(this.videosPath, filename)
    const meta = await utils.getVideoMetadata(filepath)
    if (this.setTitle && filename !== meta.filename) await utils.setVideoTitle(filepath, filename.length > meta.filename.length ? filename : meta.filename)
    if (this.shouldRename(filename, meta.filename)) renameSync(filepath, path.join(this.videosPath, meta.filename))
    listing += `${filename},${meta.title}\n`
    const entry = `${utils.ellipsis(filename, 50).padEnd(50)}  ${(String(meta.sizeGb)).padStart(4)} Gb  ${(meta.codec).padEnd(5)} ${(String(meta.height)).padStart(4)}p  ${(String(meta.bitrateKbps)).padStart(4)} kbps  ${(String(meta.fps)).padStart(2)} fps`
    if (meta.isDvdRip) {
      if (meta.height < 300) return this.detect('DvdRip under 300p', entry, meta.height)
      if (meta.bitrateKbps < 1000) return this.detect('DvdRip with low bitrate', entry, meta.bitrateKbps)
      if (meta.bitrateKbps > 2000) return this.detect('DvdRip with high bitrate', entry, meta.bitrateKbps)
    } else {
      if (meta.height < 800) return this.detect('BlurayRip under 800p', entry, meta.height)
      if (meta.bitrateKbps < 2100) return this.detect('BlurayRip with low bitrate', entry, meta.bitrateKbps)
      if (meta.bitrateKbps > 10_000) return this.detect('BlurayRip with high bitrate', entry, meta.bitrateKbps)
    }
    if (meta.fps < 24) return this.detect('Low fps', entry, meta.fps)
    if (meta.fps > 60) return this.detect('High fps', entry, meta.fps)
  }
}

const instance = new CheckVideos()
instance.start()
