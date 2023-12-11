import { gray } from 'shuutils'
import { HtmlReporter } from '../one-file/html-reporter.mjs'
import { check, checkSnapshot } from './utils.js'

const samples = [
  {
    input: '',
    output: { attr: 0, css: 0, styles: 0, tags: 0, text: 0, total: 0 },
    title: 'empty',
  },
  {
    input: '<br/><style>h1 { color: red; font-size: 2rem }</style>',
    output: { attr: 0, css: 34, styles: 0, tags: 20, text: 0, total: 54 },
    title: 'empty',
  },
  {
    input: '<h1 style="color: red">Super top !</h1>',
    output: { attr: 1, css: 0, styles: 18, tags: 9, text: 11, total: 39 },
    title: 'empty',
  },
  {
    input: '<p><small>ah</small></p> ',
    output: { attr: 0, css: 0, styles: 0, tags: 22, text: 3, total: 25 },
    title: 'empty',
  },
  {
    input: '<p style="font-weight: bold; color: black;"><small style="font-style: italic">ah</small></p> ',
    output: { attr: 2, css: 0, styles: 66, tags: 22, text: 3, total: 93 },
    title: 'empty',
  },
  {
    input: `<p>
<small>ah... !!</small>
</p>`,
    output: { attr: 0, css: 0, styles: 0, tags: 22, text: 10, total: 32 },
    title: 'empty',
  },
  {
    input: `<style data-vue-ssr-id="d706d280:0 2a082f94:0">
*,
::after,
::before {
  box-sizing: border-box;
}
</style>
<link rel="preload" href="/_nuxt/static/1626092993/state.js" as="script">`,
    output: { attr: 67, css: 92, styles: 0, tags: 22, text: 0, total: 181 },
    title: 'empty',
  },
] as const

samples.forEach(({ input, output, title }) => {
  const actual = new HtmlReporter(input)
  check(`html-report ${title} attr`, actual.attr, output.attr)
  check(`html-report ${title} css`, actual.css, output.css)
  check(`html-report ${title} styles`, actual.styles, output.styles)
  check(`html-report ${title} tags`, actual.tags, output.tags)
  check(`html-report ${title} text`, actual.text, output.text)
  check(`html-report ${title} total`, actual.total, output.total)
})

const { input, output, title } = samples[5]
const actualDebug = new HtmlReporter(input, true)
check(`html-report debug ${title} attr`, actualDebug.attr, output.attr)
check(`html-report debug ${title} css`, actualDebug.css, output.css)
check(`html-report debug ${title} styles`, actualDebug.styles, output.styles)
check(`html-report debug ${title} tags`, actualDebug.tags, output.tags)
check(`html-report debug ${title} text`, actualDebug.text, output.text)
check(`html-report debug ${title} total`, actualDebug.total, output.total)
checkSnapshot('html-report debug readable A', actualDebug.readable(3, gray))
checkSnapshot('html-report debug readable B', actualDebug.readable(16, gray))
