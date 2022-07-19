import { gray, green } from 'shuutils'

const states = {
  lookingForATag: 'lookingForATag',
  onTagName: 'onTagName',
  onTagAttr: 'onTagAttr',
}

export class HtmlReporter {
  constructor (input = '', debug = false) {
    this.input = input
    this.index = -1
    this.debug = debug
    this.stats = {
      attr: 0,
      css: 0,
      styles: 0,
      tags: 0,
      text: 0,
      total: input.length,
    }
    this.state = ''
    this.setState(states.lookingForATag)
    this.scan()
    return this.stats
  }
  scan () {
    /* eslint-disable curly */
    this.index++
    const char = this.input[this.index]
    if (!char || this.index === this.stats.total) return this.onScanComplete()
    if (char === '>') {
      this.stats.tags++
      this.setState(states.lookingForATag)
    }
    else if (this.state === states.onTagName && char === ' ') {
      this.stats.attr++
      this.setState(states.onTagAttr)
    }
    else if (this.state === states.onTagName && char === 's') {
      const [match] = this.input.slice(this.index).match(/^style[\S\s]*?<\/style>/) || []
      if (match) {
        this.stats.tags += 14 // the "<" has already been count on stats.tags, it remains "style></style>" to be count as stats.tags
        this.stats.css += match.length - 14 // here stats.css is only the content
        this.index += match.length - 1
      } else this.stats.tags++
    }
    else if (this.state === states.onTagName) {
      this.stats.tags++
    }
    else if (this.state === states.onTagAttr && char === 's') {
      const [match] = this.input.slice(this.index).match(/^style="[^"]+"/) || []
      if (match) {
        this.stats.styles += match.length
        this.index += match.length - 1
      } else this.stats.attr++
    }
    else if (this.state === states.onTagAttr && char !== '>') {
      this.stats.attr++
    }
    else if (this.state === states.lookingForATag && char !== '<') {
      this.stats.text++
    }
    else if (char === '<') {
      this.stats.tags++
      this.setState(states.onTagName)
    }
    /* eslint-enable curly */
    this.scan()
  }
  onScanComplete () {
    console.assert((this.stats.tags + this.stats.attr + this.stats.text + this.stats.styles + this.stats.css) === this.stats.total, 'sub-stats does not adds up to the total')
  }
  readable (index, color) {
    let char = this.input[index]
    if (!char) return ' '
    if (char === '\n') char = '\\n'
    if (char === ' ') char = '\\s'
    return color(char)
  }
  setState (newState) {
    if (this.debug) {
      const context = this.readable(this.index - 2, gray) + this.readable(this.index - 1, gray) + this.readable(this.index, green) + this.readable(this.index + 1, gray) + this.readable(this.index + 2, gray)
      const stateChange = `${this.state} ${gray('=>')} ${newState}`
      const stats = `tags:${this.stats.tags.toString().padEnd(3)} attr:${this.stats.attr.toString().padEnd(3)} text:${this.stats.text.toString().padEnd(3)}`
      console.log(`${this.index.toString().padEnd(4)} ${stateChange.padEnd(28)} ${stats.padEnd(24)} ${context}`)
    }
    this.state = newState
  }
}
