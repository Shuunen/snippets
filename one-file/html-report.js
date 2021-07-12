import { gray, green, red } from 'colorette'

const ellipsis = (string = '', length = 0) => string.length > length ? (string.slice(0, Math.max(0, length - 3)) + '...') : string

const states = {
  lookingForATag: 'lookingForATag',
  onTagName: 'onTagName',
  onTagAttr: 'onTagAttr',
}

class HtmlReport {
  constructor (input = '', debug = false) {
    this.input = input
    this.index = -1
    this.debug = debug
    this.stats = {
      total: input.length,
      text: 0,
      attr: 0,
      tags: 0,
      stylesInline: 0,
      stylesBlock: 0,
    }
    this.state = ''
    this.setState(states.lookingForATag)
    this.scan()
    return this.stats
  }
  scan () {
    this.index++
    const char = this.input[this.index]
    if (!char) return this.onScanComplete()
    if (char === '>') {
      this.stats.tags++
      this.setState(states.lookingForATag)
    } else if (this.state === states.onTagName && char === ' ') {
      this.stats.attr++
      this.setState(states.onTagAttr)
    } else if (this.state === states.onTagName) this.stats.tags++
    else if (this.state === states.onTagAttr && char === 's') {
      const [match] = this.input.slice(this.index).match(/^style="[^"]+"/) || []
      if (match) {
        this.stats.stylesInline += match.length
        this.index += match.length - 1
      } else this.stats.attr++
    } else if (this.state === states.onTagAttr && char !== '>') this.stats.attr++
    else if (this.state === states.lookingForATag && char !== '<') this.stats.text++
    else if (char === '<') {
      this.stats.tags++
      this.setState(states.onTagName)
    }
    this.scan()
  }
  onScanComplete () {
    console.assert((this.stats.tags + this.stats.attr + this.stats.text + this.stats.stylesInline) === this.stats.total, 'sub-stats does not adds up as total')
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
      const stateChange = `${this.state} => ${newState}`
      const stats = `tags:${this.stats.tags.toString().padEnd(3)} attr:${this.stats.attr.toString().padEnd(3)} text:${this.stats.text.toString().padEnd(3)}`
      console.log(`${this.index.toString().padEnd(3)} ${stateChange.padEnd(28)} ${stats.padEnd(24)} ${context}`)
    }
    this.state = newState
  }
}

const tests = {
  cases: [
    {
      input: '<h1 style="color: red">Super top !</h1>',
      expected: { total: 39, text: 11, attr: 1, tags: 9, stylesInline: 18, stylesBlock: 0 },
    },
    {
      input: '<p><small>ah</small></p> ',
      expected: { total: 25, text: 3, attr: 0, tags: 22, stylesInline: 0, stylesBlock: 0 },
    },
    {
      input: '<p style="font-weight: bold; color: black;"><small style="font-style: italic">ah</small></p> ',
      expected: { total: 93, text: 3, attr: 2, tags: 22, stylesInline: 66, stylesBlock: 0 },
    },
    {
      input: `<p>
        <small>ah... !!</small>
      </p>`,
      expected: { total: 46, text: 24, attr: 0, tags: 22, stylesInline: 0, stylesBlock: 0 },
    },
  ],
  valid: 0,
  invalid: 0,
}
tests.cases.forEach((test, index) => {
  if (tests.invalid > 0) return
  const results = new HtmlReport(test.input)
  const valid = JSON.stringify(results) === JSON.stringify(test.expected)
  if (valid) tests.valid++
  else tests.invalid++
  console.assert(valid, `test at index ${index} failed : ${ellipsis(test.input, 30)}`)
  if (!valid) {
    Object.keys(results).forEach(key => {
      if (test.expected[key] === results[key]) return
      console.log(`expected ${key} of ${test.expected[key]} but got ${results[key]}`)
    })
    new HtmlReport(test.input, true)
  }
})

console.log(`${green(tests.valid)} tests successful`)
if (tests.invalid > 0) console.log(red(`${tests.invalid} tests failed`))
