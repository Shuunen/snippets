#!/usr/bin/env node
import { readdir, stat } from 'fs/promises'
import path from 'path'

const maxResults = 10
const sizeGrain = 10_000

class CheckDuplicates {
  constructor () {
    /**
     * @type {string[]}
     */
    this.elements = []
    this.detected = {}
    this.target = ''
    this.nbElements = 0
    /**
     * @type {{ [key: string]: string }}
     */
    this.results = {}
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
    if (process.argv.length < 4) throw new Error('this script need a path as argument like : find-duplicates.js "U:\\Movies\\"')
    this.target = path.normalize(process.argv[3] || '')
  }

  async find () {
    console.log(`Scanning dir ${this.target}`)
    this.elements = await readdir(this.target)
    this.nbElements = this.elements.length
    console.log('Found', this.nbElements, 'elements')
  }

  ellipsis (string = '', length = 40) {
    return string.length > length ? (string.slice(0, Math.max(0, length - 3)) + '...') : string
  }

  distance (a = '', b = '') {
    // todo: something like levenshtein
    return a.length + b.length
  }

  async check () {
    this.results = {}
    for (let aIndex = 0; aIndex < this.nbElements; aIndex++)
      for (let bIndex = 0; bIndex < this.nbElements; bIndex++) {
        if (aIndex === bIndex) continue
        const a = String(this.elements[aIndex])
        const b = String(this.elements[bIndex])
        const key = aIndex + '|' + bIndex
        const keyAlt = bIndex + '|' + aIndex
        if (this.results[key] || this.results[keyAlt]) continue
        let amount = this.distance(a, b)
        const sizeA = await stat(path.join(this.target, a)).then((/** @type {{ size: number; }} */ data) => Math.round(data.size / sizeGrain))
        const sizeB = await stat(path.join(this.target, b)).then((/** @type {{ size: number; }} */ data) => Math.round(data.size / sizeGrain))
        const sizeDiff = Math.abs(sizeA - sizeB)
        amount += sizeDiff // add the size diff as distance ^^
        const amountString = (amount.toString().length === 1 ? '0' : '') + amount
        this.results[key] = `${amountString} (${sizeDiff}) : ${this.ellipsis(a)} VS ${this.ellipsis(b)}`
      }
  }

  async report () {
    const list = Object.keys(this.results).map(key => this.results[key]).sort()
    console.log(list.splice(0, maxResults))
  }
}

const instance = new CheckDuplicates()
instance.start()
