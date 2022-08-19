import { check } from 'shuutils'
import { HtmlReporter } from '../one-file/html-reporter.mjs'

const samples = [
  {
    title: 'empty',
    input: '',
    output: { attr: 0, css: 0, styles: 0, tags: 0, text: 0, total: 0 },
  },
  {
    title: 'empty',
    input: '<br/><style>h1 { color: red; font-size: 2rem }</style>',
    output: { attr: 0, css: 34, styles: 0, tags: 20, text: 0, total: 54 },
  },
  {
    title: 'empty',
    input: '<h1 style="color: red">Super top !</h1>',
    output: { attr: 1, css: 0, styles: 18, tags: 9, text: 11, total: 39 },
  },
  {
    title: 'empty',
    input: '<p><small>ah</small></p> ',
    output: { attr: 0, css: 0, styles: 0, tags: 22, text: 3, total: 25 },
  },
  {
    title: 'empty',
    input: '<p style="font-weight: bold; color: black;"><small style="font-style: italic">ah</small></p> ',
    output: { attr: 2, css: 0, styles: 66, tags: 22, text: 3, total: 93 },
  },
  {
    title: 'empty',
    input: `<p>
<small>ah... !!</small>
</p>`,
    output: { attr: 0, css: 0, styles: 0, tags: 22, text: 10, total: 32 },
  },
  {
    title: 'empty',
    input: `<style data-vue-ssr-id="d706d280:0 2a082f94:0">
*,
::after,
::before {
  box-sizing: border-box;
}
</style>
<link rel="preload" href="/_nuxt/static/1626092993/state.js" as="script">`,
    output: { attr: 67, css: 92, styles: 0, tags: 22, text: 0, total: 181 },
  },
]

samples.forEach(({ title, input, output }) => {
  const actual = new HtmlReporter(input)
  check(`html-report ${title} attr`, actual.attr, output.attr)
  check(`html-report ${title} css`, actual.css, output.css)
  check(`html-report ${title} styles`, actual.styles, output.styles)
  check(`html-report ${title} tags`, actual.tags, output.tags)
  check(`html-report ${title} text`, actual.text, output.text)
  check(`html-report ${title} total`, actual.total, output.total)
})

check.run()
