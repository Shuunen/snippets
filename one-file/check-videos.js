#!/usr/bin/env node
import { exec } from 'child_process'
import { readdir, readFile, stat, writeFileSync } from 'fs'
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
  getFileSizeInMb: async path => new Promise((resolve, reject) => {
    stat(path, (error, stats) => (error ? reject(error) : resolve(Math.round(stats.size / 1_000_000))))
  }),
  getVideoMetadata: async path => {
    const output = await utils.shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${path}" `)
    if (output[0] !== '{') throw new Error('ffprobe output should be JSON but got :' + output)
    const data = JSON.parse(output)
    // console.log(utils.prettyPrint(data))
    const media = data.format || {}
    const video = data.streams.find(s => s.codec_type === 'video') || {}
    const title = (media.tags && media.tags.title) || ''
    // console.log(utils.prettyPrint(video))
    return {
      bitrateKbps: media.bit_rate ? Math.round(media.bit_rate / 1024) : 0,
      codec: video.codec_name || 'unknown codec',
      durationSeconds: media.duration ? Math.round(media.duration) : 0,
      fps: video.avg_frame_rate ? Math.round(eval(video.avg_frame_rate)) : 0,
      height: Number.parseInt(video.height || 0, 10),
      isDvdRip: title.toLowerCase().includes('dvdrip'),
      sizeGb: media.size > 0 ? (Math.round(media.size / 100_000_000) / 10).toFixed(1) : 0,
      sizeMb: media.size > 0 ? Math.round(media.size / 1_000_000) : 0,
      title,
      width: Number.parseInt(video.width || 0, 10),
    }
  },
  ellipsis: (string = '', length = 0) => string.length > length ? (string.slice(0, Math.max(0, length - 3)) + '...') : string,
  listFiles: async path => new Promise((resolve, reject) => {
    readdir(path, (error, filenames) => (error ? reject(error) : resolve(filenames)))
  }),
  prettyPrint: object => inspect(object, { depth: 2, colors: true }),
  readFile: async path => new Promise(resolve => {
    readFile(path, 'utf8', (error, content) => (error ? resolve('') : resolve(content)))
  }),
}

class CheckVideos {
  constructor () {
    this.files = []
    this.detected = {}
    this.videosPath = ''
  }

  start (processOne) {
    console.log('\nCheck Videos is starting !\n')
    this.args()
      .then(() => this.find(processOne))
      .then(() => this.check())
      .then(() => this.report())
      .catch(error => console.error(error))
  }

  async args () {
    if (process.argv.length <= 2) console.log('Targeting current folder, you can also specify a specific path, ex : check-videos.js "U:\\Movies\\" \n')
    this.videosPath = path.normalize(process.argv[2] || process.cwd())
  }

  async find (processOne = false) {
    console.log(`Scanning dir ${this.videosPath}`)
    const isVideo = /\.(mp4|mkv|avi|wmv|m4v|mpg)$/
    const isIgnored = (await utils.readFile(path.join(this.videosPath, '.check-videos-ignore'))).split('\n')
    isIgnored.forEach((line = '') => {
      if (line.trim().length > 0 && !line.startsWith('//')) listing += `${line},\n`
    })
    this.files = (await utils.listFiles(this.videosPath)).filter(entry => (!isIgnored.includes(entry) && isVideo.test(entry)))
    if (this.files.length === 0) throw new Error('no files found with these extensions ' + isVideo)
    console.log('\n', this.files.length, 'files found\n')
    if (!processOne) return
    console.log('but only one file will be processed')
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

  async checkOne (filename) {
    const folder = path.join(this.videosPath, filename)
    const meta = await utils.getVideoMetadata(folder)
    listing += `${filename},${meta.title}\n`
    const name = utils.ellipsis(filename.split(').')[0] + ')', 30)
    const entry = `${name.padEnd(30)}  ${(String(meta.sizeGb)).padStart(4)} Gb  ${(meta.codec).padEnd(5)} ${(String(meta.height)).padStart(4)}p  ${(String(meta.bitrateKbps)).padStart(4)} kbps  ${(String(meta.fps)).padStart(2)} fps`
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
const processOne = false
instance.start(processOne)
