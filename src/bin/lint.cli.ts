#!/usr/bin/env bun
// cSpell:disable

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { cac } from 'cac'
import { ruleApplies, rules } from './lint.rules'

function lintFile(filePath: string): string[] {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false
  let { mode } = fs.statSync(filePath)
  const issues: string[] = []
  for (const rule of rules) {
    if (!ruleApplies(rule, filePath)) continue
    if (rule.fixer !== undefined) {
      const fixedContent = rule.fixer(content, filePath)
      if (fixedContent !== content) {
        content = fixedContent
        changed = true
      }
    }
    if (rule.modeFixer !== undefined) {
      const fixedMode = rule.modeFixer(mode)
      if (fixedMode !== mode) {
        fs.chmodSync(filePath, fixedMode)
        mode = fixedMode
      }
    }
    if (!rule.check(content, filePath, mode)) issues.push(`(${rule.name}) ${rule.error}`)
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8')
  return issues
}

function getTargetFiles(): string[] {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  return output
    .split('\0')
    .filter(file => file.length > 0 && fs.existsSync(file))
    .map(file => path.resolve(process.cwd(), file))
}

function main() {
  const cli = cac('lint')
  cli.usage('').help()
  const { options } = cli.parse()
  if (options.help === true) return
  const files = getTargetFiles()
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

main()
