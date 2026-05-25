// cSpell:disable

import fs from 'node:fs'
import path from 'node:path'
import glob from 'tiny-glob'
import { rules } from './lint.rules'

const argvStart = 2 // skip node binary + script path

function lintFile(filePath: string): string[] {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false
  const issues: string[] = []
  for (const rule of rules) {
    if (rule.fixer !== undefined) {
      const fixedContent = rule.fixer(content, filePath)
      if (fixedContent !== content) {
        content = fixedContent
        changed = true
      }
    }
    if (!rule.check(content, filePath)) issues.push(`(${rule.name}) ${rule.error}`)
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8')
  return issues
}

async function getTargetFiles(argv: string[]): Promise<string[]> {
  const args: Record<string, string> = {}
  for (const arg of argv.slice(argvStart)) {
    const [key = '', value = ''] = arg.replace('--', '').split('=')
    if (key.length > 0) args[key] = value
  }
  const { target = '' } = args
  if (target.length === 0) throw new Error('missing target argument')
  const matches = await glob(target, { filesOnly: true })
  return matches.map(match => path.resolve(process.cwd(), match)).filter(match => match.endsWith('.md'))
}

async function main(argv: string[]) {
  const files = await getTargetFiles(argv)
  let foundIssues = false
  for (const filePath of files) {
    const issues = lintFile(filePath)
    for (const issue of issues) {
      console.error(`File: ${filePath} - Issue: ${issue}`)
      foundIssues = true
    }
  }
  if (foundIssues) throw new Error('Lint issues found.')
  console.log('All custom rules passed successfully!')
}

await main(process.argv)
