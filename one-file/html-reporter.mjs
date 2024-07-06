/* c8 ignore start */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/prefer-regexp-exec */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable no-plusplus */
import { gray, green } from 'shuutils'

const states = {
  lookingForTag: 'lookingForATag',
  onTagAttr: 'onTagAttr',
  onTagName: 'onTagName',
  scanComplete: 'scanComplete',
}

// eslint-disable-next-line no-restricted-syntax
export class HtmlReporter {
  // eslint-disable-next-line max-statements
  constructor (input = '', isDebug = false) {
    this.input = input
    this.index = -1
    this.debug = isDebug
    this.attr = 0
    this.css = 0
    this.styles = 0
    this.tags = 0
    this.text = 0
    this.total = input.length
    this.state = ''
    this.setState(states.lookingForTag)
    this.scan()
  }

  onScanComplete () {
    this.setState(states.scanComplete)
    console.assert(this.total === (this.tags + this.attr + this.text + this.styles + this.css), 'sub-stats does not adds up to the total')
  }

  /**
   *
   * @param {number} index the index
   * @param {Function} color the color to use
   * @returns {string} the readable string
   */
  readable (index, color) {
    let char = this.input[index]
    if (!char) return ' '
    if (char === '\n') char = String.raw`\n`
    if (char === ' ') char = String.raw`\s`
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return color(char)
  }


  // eslint-disable-next-line max-statements, complexity
  scan () {
    /* eslint-disable curly */
    this.index++
    const char = this.input[this.index]
    if (!char || this.index === this.total) { this.onScanComplete(); return }
    if (char === '>') {
      this.tags++
      this.setState(states.lookingForTag)
    } else if (this.state === states.onTagName && char === ' ') {
      this.attr++
      this.setState(states.onTagAttr)
    } else if (this.state === states.onTagName && char === 's') {
      const [match] = this.input.slice(this.index).match(/^style[\s\S]*?<\/style>/u) || []

      if (match) {
        this.tags += 14 // the "<" has already been count on stats.tags, it remains "style></style>" to be count as stats.tags
        this.css += match.length - 14 // here stats.css is only the content
        this.index += match.length - 1
      } else
        this.tags++
    } else if (this.state === states.onTagName) {
      this.tags++
    } else if (this.state === states.onTagAttr && char === 's') {
      const [match] = this.input.slice(this.index).match(/^style="[^"]+"/u) || []
      if (match) {
        this.styles += match.length
        this.index += match.length - 1
      } else
        this.attr++
    } else if (this.state === states.onTagAttr && char !== '>') {
      this.attr++
    } else if (this.state === states.lookingForTag && char !== '<') {
      this.text++
    } else if (char === '<') {
      this.tags++
      this.setState(states.onTagName)
    }
    /* eslint-enable curly */
    this.scan()
  }

  /**
   * Set the state of the scanner
   * @param {string} newState the new state
   */
  // eslint-disable-next-line unicorn/no-keyword-prefix
  setState (newState) {
    if (this.debug) {
      const context = this.readable(this.index - 2, gray) + this.readable(this.index - 1, gray) + this.readable(this.index, green) + this.readable(this.index + 1, gray) + this.readable(this.index + 2, gray)
      // eslint-disable-next-line unicorn/no-keyword-prefix
      const stateChange = `${this.state} ${gray('=>')} ${newState}`
      const stats = `tags:${this
        .tags
        .toString()
        .padEnd(3)} attr:${this.attr.toString().padEnd(3)} text:${this.text.toString().padEnd(3)}`
      console.log(`${this
        .index
        .toString()
        .padEnd(4)} ${stateChange.padEnd(28)} ${stats.padEnd(24)} ${context}`)
    }
    // eslint-disable-next-line unicorn/no-keyword-prefix
    this.state = newState
  }
}

