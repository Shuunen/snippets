// oxlint-disable no-plusplus, no-magic-numbers
import { gray, green } from 'shuutils'
import { logger } from './repo-banner.utils'

const states = {
  lookingForTag: 'lookingForATag',
  onTagAttr: 'onTagAttr',
  onTagName: 'onTagName',
  scanComplete: 'scanComplete',
}

const regex = {
  styleAttr: /^style="[^"]+"/u,
  styleTag: /^style[\s\S]*?<\/style>/u,
}

export class HtmlReporter {
  constructor(input = '', isDebug = false) {
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

  onScanComplete() {
    this.setState(states.scanComplete)
    const expectedTotal = this.tags + this.attr + this.text + this.styles + this.css
    /* v8 ignore if */
    if (this.total !== expectedTotal) throw new Error(`Total length (${this.total}) does not match the sum of sub-stats (${expectedTotal})`)
  }

  /**
   *
   * @param {number} index the index
   * @param {Function} color the color to use
   * @returns {string} the readable string
   */
  readable(index, color) {
    let char = this.input[index]
    if (!char) return ' '
    if (char === '\n') char = String.raw`\n`
    if (char === ' ') char = String.raw`\s`
    return color(char)
  }

  // oxlint-disable max-statements
  scan() {
    this.index++
    const char = this.input[this.index]
    if (!char || this.index === this.total) {
      this.onScanComplete()
      return
    }
    /* v8 ignore else */
    if (char === '>') {
      this.tags++
      this.setState(states.lookingForTag)
    } else if (this.state === states.onTagName && char === ' ') {
      this.attr++
      this.setState(states.onTagAttr)
    } else if (this.state === states.onTagName && char === 's') {
      const [match] = this.input.slice(this.index).match(regex.styleTag) ?? []

      if (match) {
        this.tags += 14 // the "<" has already been count on stats.tags, it remains "style></style>" to be count as stats.tags
        this.css += match.length - 14 // here stats.css is only the content
        this.index += match.length - 1
      } else this.tags++
    } else if (this.state === states.onTagName) this.tags++
    else if (this.state === states.onTagAttr && char === 's') {
      const [match] = this.input.slice(this.index).match(regex.styleAttr) ?? []
      if (match) {
        this.styles += match.length
        this.index += match.length - 1
      } else this.attr++
    } else if (this.state === states.onTagAttr && char !== '>') this.attr++
    else if (this.state === states.lookingForTag && char !== '<') this.text++
    else if (char === '<') {
      this.tags++
      this.setState(states.onTagName)
    }
    this.scan()
  }

  /**
   * Set the state of the scanner
   * @param {string} newState the new state
   */
  setState(newState) {
    if (this.debug) {
      const context = this.readable(this.index - 2, gray) + this.readable(this.index - 1, gray) + this.readable(this.index, green) + this.readable(this.index + 1, gray) + this.readable(this.index + 2, gray)
      const stateChange = `${this.state} ${gray('=>')} ${newState}`
      const stats = `tags:${this.tags.toString().padEnd(3)} attr:${this.attr.toString().padEnd(3)} text:${this.text.toString().padEnd(3)}`
      logger.info(`${this.index.toString().padEnd(4)} ${stateChange.padEnd(28)} ${stats.padEnd(24)} ${context}`)
    }
    this.state = newState
  }
}
