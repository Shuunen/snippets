const path = require('path')
const fs = require('fs')
const distance = require('./levenshtein')
const { promisify } = require('util')
const readDirectory = promisify(fs.readdir)
const stat = promisify(fs.stat)

const maxResults = 10
const sizeGrain = 10000

class CheckDuplicates {
  constructor() {
    this.elements = []
    this.detected = {}
    this.target = ''
  }

  async start() {
    console.log('\nCheck duplicates is starting !')
    await this.args()
    await this.find()
    await this.check()
    await this.report()
    console.log('Check duplicates ended.')
  }

  async args() {
    if (process.argv.length < 4) throw new Error('this script need a path as argument like : node find-duplicates.js "U:\\Movies\\"')
    this.target = path.normalize(process.argv[3])
  }

  async find() {
    console.log(`Scanning dir ${this.target}`)
    this.elements = await readDirectory(this.target)
    this.nbElements = this.elements.length
    console.log('Found', this.nbElements, 'elements')
  }

  ellipsis(string = '', length = 40) {
    return string.length > length ? (string.slice(0, Math.max(0, length - 3)) + '...') : string
  }

  async check() {
    this.results = {}
    for (let aIndex = 0; aIndex < this.nbElements; aIndex++)
      for (let bIndex = 0; bIndex < this.nbElements; bIndex++) {
        if (aIndex === bIndex) continue
        const a = this.elements[aIndex]
        const b = this.elements[bIndex]
        const key = aIndex + '|' + bIndex
        const keyAlt = bIndex + '|' + aIndex
        if (this.results[key] || this.results[keyAlt]) continue
        let amount = distance(a, b)
        /* eslint-disable no-await-in-loop */
        const sizeA = await stat(path.join(this.target, a)).then(data => Math.round(data.size / sizeGrain))
        const sizeB = await stat(path.join(this.target, b)).then(data => Math.round(data.size / sizeGrain))
        /* eslint-enable no-await-in-loop */
        const sizeDiff = Math.abs(sizeA - sizeB)
        amount += sizeDiff // add the size diff as distance ^^
        amount = (amount.toString().length === 1 ? '0' : '') + amount
        this.results[key] = `${amount} (${sizeDiff}) : ${this.ellipsis(a)} VS ${this.ellipsis(b)}`
      }
  }

  async report() {
    const list = Object.keys(this.results).map(key => this.results[key]).sort()
    console.log(list.splice(0, maxResults))
  }
}

const instance = new CheckDuplicates()
instance.start()
