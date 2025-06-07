import { gray } from 'shuutils'
import { expect, it } from 'vitest'
import { HtmlReporter } from './html-reporter.mjs'

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

for (const { input, output, title } of samples) {
  const actual = new HtmlReporter(input)
  it(`html-report ${title} attr`, () => {
    expect(actual.attr).toBe(output.attr)
  })
  it(`html-report ${title} css`, () => {
    expect(actual.css).toBe(output.css)
  })
  it(`html-report ${title} styles`, () => {
    expect(actual.styles).toBe(output.styles)
  })
  it(`html-report ${title} tags`, () => {
    expect(actual.tags).toBe(output.tags)
  })
  it(`html-report ${title} text`, () => {
    expect(actual.text).toBe(output.text)
  })
  it(`html-report ${title} total`, () => {
    expect(actual.total).toBe(output.total)
  })
}

const { input, output, title } = samples[5]
const actualDebug = new HtmlReporter(input, true)
it(`html-report debug ${title} attr`, () => {
  expect(actualDebug.attr).toBe(output.attr)
})
it(`html-report debug ${title} css`, () => {
  expect(actualDebug.css).toBe(output.css)
})
it(`html-report debug ${title} styles`, () => {
  expect(actualDebug.styles).toBe(output.styles)
})
it(`html-report debug ${title} tags`, () => {
  expect(actualDebug.tags).toBe(output.tags)
})
it(`html-report debug ${title} text`, () => {
  expect(actualDebug.text).toBe(output.text)
})
it(`html-report debug ${title} total`, () => {
  expect(actualDebug.total).toBe(output.total)
})
it('html-report debug readable A', () => {
  expect(actualDebug.readable(3, gray)).toMatchInlineSnapshot(String.raw`"[90m\n[39m"`)
})
it('html-report debug readable B', () => {
  expect(actualDebug.readable(16, gray)).toMatchInlineSnapshot(String.raw`"[90m\s[39m"`)
})
