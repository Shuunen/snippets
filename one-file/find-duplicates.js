/* c8 ignore start */
/* eslint-disable @typescript-eslint/class-methods-use-this */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/require-array-sort-compare */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable max-statements */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-warning-comments */
/* eslint-disable perfectionist/sort-classes */
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const maxResults = 10
const sizeGrain = 10_000

// eslint-disable-next-line no-restricted-syntax
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

  args () {
    if (process.argv.length < 4) throw new Error(String.raw`this script need a path as argument like : find-duplicates.js "U:\Movies\"`)
    this.target = path.normalize(process.argv[3] || '')
  }
  ellipsis (string = '', length = 40) {
    return string.length > length ? (`${string.slice(0, Math.max(0, length - 3))}...`) : string
  }
  distance (stringA = '', stringB = '') {
    // todo: something like levenshtein
    return stringA.length + stringB.length
  }
  report () {
    const list = Object.keys(this.results).map(key => this.results[key]).sort()
    console.log(list.splice(0, maxResults))
  }
  async start () {
    console.log('\nCheck duplicates is starting !')
    this.args()
    await this.find()
    await this.check()
    this.report()
    console.log('Check duplicates ended.')
  }

  async find () {
    console.log(`Scanning dir ${this.target}`)
    this.elements = await readdir(this.target)
    this.nbElements = this.elements.length
    console.log('Found', this.nbElements, 'elements')
  }

  async check () {
    this.results = {}
    for (let aIndex = 0; aIndex < this.nbElements; aIndex += 1)
      for (let bIndex = 0; bIndex < this.nbElements; bIndex += 1) {
        if (aIndex === bIndex) continue
        const itemA = String(this.elements[aIndex])
        const itemB = String(this.elements[bIndex])
        const key = `${aIndex}|${bIndex}`
        const keyAlt = `${bIndex}|${aIndex}`
        if (this.results[key] || this.results[keyAlt]) continue
        let amount = this.distance(itemA, itemB)
        const sizeA = await stat(path.join(this.target, itemA)).then((/** @type {{ size: number; }} */ data) => Math.round(data.size / sizeGrain))
        const sizeB = await stat(path.join(this.target, itemB)).then((/** @type {{ size: number; }} */ data) => Math.round(data.size / sizeGrain))
        const sizeDiff = Math.abs(sizeA - sizeB)
        amount += sizeDiff // add the size diff as distance ^^
        const amountString = (amount.toString().length === 1 ? '0' : '') + amount
        this.results[key] = `${amountString} (${sizeDiff}) : ${this.ellipsis(itemA)} VS ${this.ellipsis(itemB)}`
      }
  }
}

const instance = new CheckDuplicates()
await instance.start()
