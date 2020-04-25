import { exec } from 'child_process'
import { readdir, stat } from 'fs'
import { join, normalize } from 'path'
import { inspect } from 'util'

const utils = {
  shellCommand: async (cmd) => new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) console.error(error)
      resolve(stdout || stderr)
    })
  }),
  getFileSizeInMb: async (path) => new Promise((resolve, reject) => {
    stat(path, (err, stats) => (err ? reject(err) : resolve(Math.round(stats.size / 1000000.0))))
  }),
  getVideoMetadata: async (path) => {
    const output = await utils.shellCommand(`ffprobe -show_format -show_streams -print_format json -v quiet -i "${path}" `)
    if (!output[0] === '{') throw new Error('ffprobe output should be JSON but got :' + output)
    const data = JSON.parse(output)
    // console.log(utils.prettyPrint(data))
    const media = data.format || {}
    const video = data.streams.find(s => s.codec_type === 'video') || {}
    // console.log(utils.prettyPrint(video))
    return {
      codec: video.codec_name || 'unknown codec',
      width: parseInt(video.width || 0),
      height: parseInt(video.height || 0),
      // eslint-disable-next-line no-eval
      fps: video.r_frame_rate ? Math.round(eval(video.r_frame_rate)) : 0,
      bitrateKbps: media.bit_rate ? Math.round(media.bit_rate / 1024) : 0,
      durationSeconds: media.duration ? Math.round(media.duration) : 0,
      sizeMb: media.size ? Math.round(media.size / 1000000) : 0,
    }
  },
  cutWords: (str = '', nb) => ((str.match(new RegExp(`(?:\\b\\w+\\b[\\s\\r\\n]*){1,${nb}}`)) || [])[0] + '').trim(),
  ellipsis: (str = '', len = 0) => str.length > len ? (str.substring(0, len - 3) + '...') : str,
  listFiles: async (path) => new Promise((resolve, reject) => {
    readdir(path, (err, filenames) => (err ? reject(err) : resolve(filenames)))
  }),
  prettyPrint: obj => inspect(obj, { depth: 2, colors: true }),
}

class CheckVideos {
  constructor () {
    this.files = []
    this.detected = {}
    this.videosPath = ''
  }

  start () {
    console.log('\nCheck Videos is starting !\n')
    this.args()
      .then(() => this.find())
      .then(() => this.check())
      .then(() => this.report())
      .catch(err => console.error(err))
      .then(() => console.log('\nCheck Videos ended.'))
  }

  async args () {
    if (process.argv.length <= 2) throw new Error('this script need a path as argument like : node-esm check-videos.mjs "U:\\Movies\\"')
    this.videosPath = normalize(process.argv[2])
  }

  async find () {
    console.log(`Scanning dir ${this.videosPath}`)
    const isVideo = /\.(mp4|mkv|avi|wmv|m4v|mpg)$/
    this.files = (await utils.listFiles(this.videosPath)).filter(entry => isVideo.test(entry))
    if (!this.files.length) throw new Error('no files found with these extensions ' + isVideo)
    console.log(this.files.length, 'files found')
  }

  async check () {
    const total = this.files.length
    // console.log('in checkAll with a total of', total)
    for (let index = 0; index < total; index++) {
      const filename = this.files[index]
      console.log(`checking file ${(index + 1 + '').padStart((total + '').length)} / ${total} : ${filename}`)
      await this.checkOne(filename)
    }
  }

  async report () {
    const types = Object.keys(this.detected)
    if (types.length === 0) return console.log('\x1b[32m%s\x1b[0m', '\nAll checked files seems fine :)')
    const getValue = str => parseInt(str.match(/\[(\d+)\]/)[1])
    const byValueAsc = (a, b) => (getValue(a) - getValue(b))
    let total = 0
    console.log('\x1b[1m%s\x1b[0m', '\nReport :')
    types.forEach(type => {
      console.log('\x1b[100m%s\x1b[0m', `\n${type} :`)
      this.detected[type].sort(byValueAsc).forEach((file, index) => {
        const even = (index % 2) === 0
        const line = ` - ${file}`
        total++
        if (even) return console.log('\x1b[91m%s\x1b[0m', line)
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
    const path = join(this.videosPath, filename)
    const meta = await utils.getVideoMetadata(path)
    // console.log('found meta :', utils.prettyPrint(meta))
    const name = utils.ellipsis(filename.split(').')[0] + ')', 30)
    const entry = `${name.padEnd(30)}  ${(meta.codec).padEnd(5)} ${(meta.height + '').padStart(4)}p  ${(meta.bitrateKbps + '').padStart(4)}kbps  ${(meta.fps + '').padStart(2)}fps`
    if (meta.height < 1000) return this.detect('Under 1000p', entry, meta.height)
    if (meta.bitrateKbps < 2000) return this.detect('Low bitrate', entry, meta.bitrateKbps)
    if (meta.bitrateKbps > 8000) return this.detect('High bitrate', entry, meta.bitrateKbps)
    if (meta.fps < 24) return this.detect('Low fps', entry, meta.fps)
    if (meta.fps > 60) return this.detect('High fps', entry, meta.fps)
  }
}

const instance = new CheckVideos()
instance.start()
