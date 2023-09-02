/* eslint-disable no-plusplus */
// @ts-ignore
import { gray, green } from 'shuutils'

const states = {
  lookingForATag: 'lookingForATag',
  onTagAttr: 'onTagAttr',
  onTagName: 'onTagName',
  scanComplete: 'scanComplete',
}

export class HtmlReporter {
  // eslint-disable-next-line max-statements
  constructor (input = '', debug = false) {
    this.input = input
    this.index = -1
    this.debug = debug
    this.attr = 0
    this.css = 0
    this.styles = 0
    this.tags = 0
    this.text = 0
    this.total = input.length
    this.state = ''
    this.setState(states.lookingForATag)
    this.scan()
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity, max-statements, consistent-return, complexity
  scan () {
    /* eslint-disable curly */
    this.index++
    const char = this.input[this.index]
    if (!char || this.index === this.total)
      return this.onScanComplete()

    if (char === '>') {
      this.tags++
      this.setState(states.lookingForATag)
    } else if (this.state === states.onTagName && char === ' ') {
      this.attr++
      this.setState(states.onTagAttr)
    } else if (this.state === states.onTagName && char === 's') {
      const [match] = this.input.slice(this.index).match(/^style[\s\S]*?<\/style>/u) || []

      if (match) {
        this.tags += 14 // the "<" has already been count on stats.tags, it remains "style></style>" to be count as stats.tags
        // eslint-disable-next-line no-magic-numbers
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
    } else if (this.state === states.lookingForATag && char !== '<') {
      this.text++
      // eslint-disable-next-line sonarjs/elseif-without-else
    } else if (char === '<') {
      this.tags++
      this.setState(states.onTagName)
    }
    /* eslint-enable curly */
    this.scan()
  }

  onScanComplete () {
    this.setState(states.scanComplete)
    console.assert(this.total === (this.tags + this.attr + this.text + this.styles + this.css), 'sub-stats does not adds up to the total')
  }

  /**
   * @param {number} index
   * @param {(char: string) => string} color
   * @returns
   */
  readable (index, color) {
    let char = this.input[index]
    if (!char)
      return ' '

    if (char === '\n')
      char = '\\n'

    if (char === ' ')
      char = '\\s'

    return color(char)
  }

  /**
   * Set the state of the scanner
   * @param {string} newState
   */
  // eslint-disable-next-line unicorn/no-keyword-prefix
  setState (newState) {
    if (this.debug) {
      // eslint-disable-next-line no-magic-numbers
      const context = this.readable(this.index - 2, gray) + this.readable(this.index - 1, gray) + this.readable(this.index, green) + this.readable(this.index + 1, gray) + this.readable(this.index + 2, gray)
      // eslint-disable-next-line unicorn/no-keyword-prefix
      const stateChange = `${this.state} ${gray('=>')} ${newState}`
      const stats = `tags:${this
        .tags
        .toString()
        .padEnd(3)} attr:${this.attr.toString().padEnd(3)} text:${this.text.toString().padEnd(3)}` // eslint-disable-line no-magic-numbers
      console.log(`${this
        .index
        .toString()
        .padEnd(4)} ${stateChange.padEnd(28)} ${stats.padEnd(24)} ${context}`) // eslint-disable-line no-magic-numbers
    }
    // eslint-disable-next-line unicorn/no-keyword-prefix
    this.state = newState
  }
}

