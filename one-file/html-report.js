/* c8 ignore start */
import { readFile } from 'node:fs/promises'
import { blue, gray, yellow } from 'shuutils'
import { HtmlReporter } from './html-reporter.mjs'

const /** @type {Record<string, string>} */ explanations = {
    attr: String(blue('attributes')),
    css: `${blue('css')} code`,
    styles: `${blue('styles')} inline`,
    tags: `${blue('tag')} names`,
    text: `${blue('text')} nodes`,
  }

const /** @type {Record<string, string>} */ examples = {
    attr: `${gray('<h1')}${yellow(' an-attribute="value" another-one')}${gray(' style="color: red">A super title !</h1>')}`,
    css: `${gray('<style>')}${yellow('div.a-selector { font-weight: bold; }')}${gray('</style>')}`,
    styles: `${gray('<h1 attribute="value"')}${yellow('style="color: red"')}${gray('>A super title !</h1>')}`,
    tags: `${yellow('<h1')}${gray(' attribute="value"')}${yellow('>')}${gray('A super title !')}${yellow('</h1>')}`,
    text: `${gray('<h1>')}${yellow('A super title !')}${gray('</h1>')}`,
  }

/**
 * @param {HtmlReporter} stats the stats to show
 */
function showReport(stats) {
  let report = 'Scan detected :\n'
  for (const [key, value] of Object.entries(stats)) {
    if (key === 'total') continue
    const percent = `${Math.round((value / stats.total) * 100)} %`
    report += `- ${blue(percent.padStart(4))} of ${explanations[key]?.padEnd(25) ?? 'err-no-explanation-found'} ${examples[key] ?? 'err-no-example-found'}\n`
  }
  console.log(report)
}

/**
 *
 * @param input the input
 */
async function startReport(input = '') {
  let content = input // lets assume input is some html
  // biome-ignore lint/style/useNamingConvention: it's
  // biome-ignore lint/performance/useTopLevelRegex: ok buddy ^^
  const isLikeAPath = /[\w-]+\.\w{2,4}$/u.test(input)
  if (isLikeAPath) {
    console.log('Scanning file', gray(input))
    content = await readFile(input, 'utf8')
  }
  const stats = new HtmlReporter(content)
  showReport(stats)
}

if (process.argv[2] !== undefined) await startReport(process.argv[2])
