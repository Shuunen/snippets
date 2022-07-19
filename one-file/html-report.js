#!/usr/bin/env node
import { readFile } from 'fs/promises'
import { blue, gray, yellow } from 'shuutils'
import { HtmlReporter } from './html-reporter.mjs'

const explanations = {
  attr: `${blue('attributes')}`,
  css: `${blue('css')} code`,
  styles: `${blue('styles')} inline`,
  tags: `${blue('tag')} names`,
  text: `${blue('text')} nodes`,
}

const examples = {
  attr: `${gray('<h1')}${yellow(' an-attribute="value" another-one')}${gray(' style="color: red">A super title !</h1>')}`,
  css: `${gray('<style>')}${yellow('div.a-selector { font-weight: bold; }')}${gray('</style>')}`,
  styles: `${gray('<h1 attribute="value"')}${yellow('style="color: red"')}${gray('>A super title !</h1>')}`,
  tags: `${yellow('<h1')}${gray(' attribute="value"')}${yellow('>')}${gray('A super title !')}${yellow('</h1>')}`,
  text: `${gray('<h1>')}${yellow('A super title !')}${gray('</h1>')}`,
}

function showReport (stats) {
  let report = 'Scan detected :\n'
  Object.keys(stats).forEach(key => {
    if (key === 'total') return
    const percent = Math.round(stats[key] / stats.total * 100) + ' %'
    report += `- ${blue(percent.padStart(4))} of ${explanations[key].padEnd(25)} ${examples[key]}\n`
  })
  console.log(report)
}

async function startReport (input = '') {
  let content = input // lets assume input is some html
  const seemsLikeAPath = /[\w-]+\.\w{2,4}$/.test(input)
  if (seemsLikeAPath) {
    console.log('Scanning file', gray(input))
    content = await readFile(input, 'utf8')
  }
  const stats = new HtmlReporter(content)
  showReport(stats)
}

if (process.argv[2]) startReport(process.argv[2])
