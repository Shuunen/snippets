import { blue, blueBright, gray, green, red, yellow } from 'colorette'
import { readFile } from 'fs/promises'

const ellipsis = (string = '', length = 0) => string.length > length ? (string.slice(0, Math.max(0, length - 3)) + '...') : string

const states = {
  lookingForATag: 'lookingForATag',
  onTagName: 'onTagName',
  onTagAttr: 'onTagAttr',
}

const explanations = {
  attr: `${blue('tag attributes')}, ex: ${gray('<h1')}${yellow(' an-attribute="value" another-one')}${gray(' style="color: red">A super title !</h1>')}`,
  css: `${blue('css')} code inside style tags, ex: ${gray('<style>')}${yellow('div.a-selector { font-weight: bold; }')}${gray('</style>')}`,
  styles: `${blue('styles')} inline, ex: ${gray('<h1 attribute="value"')}${yellow('style="color: red"')}${gray('>A super title !</h1>')}`,
  tags: `${blue('tag')} names, ex: ${yellow('<h1')}${gray(' attribute="value"')}${yellow('>')}${gray('A super title !')}${yellow('</h1>')}`,
  text: `${blue('text')} nodes, ex: ${gray('<h1>')}${yellow('A super title !')}${gray('</h1>')}`,
}

class HtmlReport {
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
    /* eslint-disable curly, @typescript-eslint/brace-style */
    this.index++
    const char = this.input[this.index]
    if (!char) return this.onScanComplete()
    if (char === '>') {
      this.stats.tags++
      this.setState(states.lookingForATag)
    }
    else if (this.state === states.onTagName && char === ' ') {
      this.stats.attr++
      this.setState(states.onTagAttr)
    }
    else if (this.state === states.onTagName && char === 's') {
      const [match] = this.input.slice(this.index).match(/^style>.*?<\/style>/) || []
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
    /* eslint-enable curly, @typescript-eslint/brace-style */
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
      const stateChange = `${this.state} => ${newState}`
      const stats = `tags:${this.stats.tags.toString().padEnd(3)} attr:${this.stats.attr.toString().padEnd(3)} text:${this.stats.text.toString().padEnd(3)}`
      console.log(`${this.index.toString().padEnd(3)} ${stateChange.padEnd(28)} ${stats.padEnd(24)} ${context}`)
    }
    this.state = newState
  }
}

function startTests () {
  console.log('no input given, starting tests...')
  const tests = {
    cases: [
      {
        input: '<br/><style>h1 { color: red; font-size: 2rem }</style>',
        expected: { total: 54, text: 0, attr: 0, tags: 20, styles: 0, css: 34 },
      },
      {
        input: '<h1 style="color: red">Super top !</h1>',
        expected: { total: 39, text: 11, attr: 1, tags: 9, styles: 18, css: 0 },
      },
      {
        input: '<p><small>ah</small></p> ',
        expected: { total: 25, text: 3, attr: 0, tags: 22, styles: 0, css: 0 },
      },
      {
        input: '<p style="font-weight: bold; color: black;"><small style="font-style: italic">ah</small></p> ',
        expected: { total: 93, text: 3, attr: 2, tags: 22, styles: 66, css: 0 },
      },
      {
        input: `<p>
          <small>ah... !!</small>
        </p>`,
        expected: { total: 50, text: 28, attr: 0, tags: 22, styles: 0, css: 0 },
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
}

function showReport (stats) {
  let report = 'Scan detected :\n'
  Object.keys(stats).forEach(key => {
    if (key === 'total' || stats[key] === 0) return
    const percent = Math.round(stats[key] / stats.total * 100) + '%'
    report += `- ${blueBright(percent.padStart(3))} of ${explanations[key]}\n`
  })
  console.log(report)
}

async function startReport (input = '') {
  let content = input // lets assume input is some html
  const seemsLikeAPath = /[\w-]+\.\w{2,4}$/.test(input)
  if (seemsLikeAPath) {
    console.log('Scanning file', gray(input))
    content = await readFile(input, 'utf-8')
  }
  const stats = new HtmlReport(content)
  showReport(stats)
}

if (process.argv[2]) startReport(process.argv[2])
else startTests()
