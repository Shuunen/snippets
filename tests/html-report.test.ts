import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { HtmlReporter } from '../one-file/html-reporter.mjs'

test('html-report A', () => equal(new HtmlReporter('<br/><style>h1 { color: red; font-size: 2rem }</style>'), { attr: 0, css: 34, styles: 0, tags: 20, text: 0, total: 54 }))

test('html-report B', () => equal(new HtmlReporter('<h1 style="color: red">Super top !</h1>'), { attr: 1, css: 0, styles: 18, tags: 9, text: 11, total: 39 }))

test('html-report C', () => equal(new HtmlReporter('<p><small>ah</small></p> '),  { attr: 0, css: 0, styles: 0, tags: 22, text: 3, total: 25 }))

test('html-report D', () => equal(new HtmlReporter('<p style="font-weight: bold; color: black;"><small style="font-style: italic">ah</small></p> '), { attr: 2, css: 0, styles: 66, tags: 22, text: 3, total: 93 }))

test('html-report E', () => equal(new HtmlReporter(`<p>
<small>ah... !!</small>
</p>`), { attr: 0, css: 0, styles: 0, tags: 22, text: 10, total: 32 }))

test('html-report F', () => equal(new HtmlReporter(`<style data-vue-ssr-id="d706d280:0 2a082f94:0">
*,
::after,
::before {
  box-sizing: border-box;
}
</style>
<link rel="preload" href="/_nuxt/static/1626092993/state.js" as="script">`), { attr: 67, css: 92, styles: 0, tags: 22, text: 0, total: 181 }))

test.run()
