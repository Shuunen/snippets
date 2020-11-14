const path = require('path')
const fs = require('fs')
const distance = require('./levenshtein')
const { promisify } = require('util')
const readDirectory = promisify(fs.readdir)

class CheckDuplicates {
  constructor () {
    this.elements = []
    this.detected = {}
    this.target = ''
  }

  async start () {
    console.log('\nCheck duplicates is starting !')
    await this.args()
    await this.find()
    await this.check()
    await this.report()
    console.log('Check duplicates ended.')
  }

  async args () {
    if (process.argv.length < 4) throw new Error('this script need a path as argument like : node find-duplicates.js "U:\\Movies\\"')
    this.target = path.normalize(process.argv[3])
  }

  async find () {
    console.log(`Scanning dir ${this.target}`)
    this.elements = await readDirectory(this.target)
    this.nbElements = this.elements.length
    console.log('Found', this.nbElements, 'elements')
  }

  ellipsis (string = '', length = 40) {
    return string.length > length ? (string.slice(0, Math.max(0, length - 3)) + '...') : string
  }

  async check () {
    this.results = {}
    for (let aIndex = 0; aIndex < this.nbElements; aIndex++) {
      for (let bIndex = 0; bIndex < this.nbElements; bIndex++) {
        if (aIndex === bIndex) continue
        const a = this.elements[aIndex]
        const b = this.elements[bIndex]
        const key = aIndex + '|' + bIndex
        const keyAlt = bIndex + '|' + aIndex
        if (this.results[key] || this.results[keyAlt]) continue
        let amount = distance(a, b) + ''
        amount = (amount.length === 1 ? '0' : '') + amount
        this.results[key] = amount + ' : ' + this.ellipsis(a) + ' VS ' + this.ellipsis(b)
      }
    }
  }

  async report () {
    const list = Object.keys(this.results).map(key => this.results[key])
    console.log(list.sort())
  }
}

const instance = new CheckDuplicates()
instance.start()
