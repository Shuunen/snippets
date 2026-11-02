// cSpell:disable

const regexH1 = /^#\s+.+$/gm
const regexCodeBlock = /^```[\s\S]*?^```[ \t]*$/gmu

function stripCodeBlocks(content: string): string {
  return content.replaceAll(regexCodeBlock, '')
}

const shebang = '#!/usr/bin/env bun'
const executableMode = 0o755
const octalBase = 8

export type Rule = {
  appliesTo: (filePath: string) => boolean
  check: (content: string, filePath?: string, mode?: number) => boolean
  error: string
  fixer?: (content: string, filePath: string) => string
  modeFixer?: (mode: number) => number
  name: string
}

export function hasOneH1(content: string): boolean {
  const withoutBom = content.replace(/^﻿/u, '')
  const withoutCodeBlocks = stripCodeBlocks(withoutBom)
  const matches = withoutCodeBlocks.match(regexH1)
  return Array.isArray(matches) && matches.length === 1
}

export function hasContent(content: string): boolean {
  const lines = content.split('\n').filter(line => line.trim().length > 0)
  return lines.length > 1
}

export function hasNoTodos(content: string): boolean {
  return !content.includes('TODO') && !content.includes('TBD') && !content.includes('À compléter')
}

export function isKebabCaseFilename(filePath: string): boolean {
  const baseName = filePath.split(/[/\\]/u).at(-1)?.replace('.md', '') ?? ''
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(baseName)
}

function normalizeContent(content: string): string {
  return `${content.replaceAll('\r\n', '\n').replaceAll(/\n+$/g, '')}\n`
}

export function ruleApplies(rule: Rule, filePath: string): boolean {
  return rule.appliesTo(filePath)
}

export function isManualFile(filePath: string): boolean {
  return /(?:^|[/\\])manuals[/\\].+\.md$/u.test(filePath)
}

export function isCliFile(filePath: string): boolean {
  return /\.cli\.(?:js|ts)$/u.test(filePath)
}

export function isShellFile(filePath: string): boolean {
  return filePath.endsWith('.sh')
}

export function hasShebang(content: string): boolean {
  return content.split('\n')[0]?.trimEnd() === shebang
}

export function isExecutable(mode: number): boolean {
  return /[1357]{3}$/u.test(mode.toString(octalBase))
}

/**
 * Tell if the content avoids process.argv, process.argv[1] stays allowed as it only tells if the cli is the entry point
 * @param content the file content
 * @returns true when process.argv is not read
 */
export function hasNoProcessArgv(content: string): boolean {
  return !/process\.argv(?!\[1\])/u.test(content)
}

function addShebang(content: string): string {
  if (hasShebang(content)) return content
  const withoutShebang = content.startsWith('#!') ? content.slice(content.indexOf('\n') + 1) : content
  return `${shebang}\n${withoutShebang}`
}

export const rules: Rule[] = [
  {
    appliesTo: isManualFile,
    check: (content: string) => hasOneH1(content),
    error: 'must contain exactly one first-level title (#)',
    name: 'single H1',
  },
  {
    appliesTo: isManualFile,
    check: (content: string) => hasContent(content),
    error: 'must have content beyond the title',
    name: 'has content',
  },
  {
    appliesTo: isManualFile,
    check: (content: string) => hasNoTodos(content),
    error: 'contains TODO, TBD, or placeholder text — please complete or remove',
    name: 'no todos',
  },
  {
    appliesTo: isManualFile,
    check: (_content: string, filePath = '') => isKebabCaseFilename(filePath),
    error: 'filename must be lowercase kebab-case (e.g. my-manual.md)',
    fixer: (content: string) => normalizeContent(content),
    name: 'kebab-case filename',
  },
  {
    appliesTo: isCliFile,
    check: (content: string) => hasShebang(content),
    error: `cli must start with ${shebang}`,
    fixer: addShebang,
    name: 'cli shebang',
  },
  {
    appliesTo: isCliFile,
    check: (_content: string, _filePath = '', mode = 0) => isExecutable(mode),
    error: 'cli must be executable (chmod +x)',
    modeFixer: (mode: number) => (isExecutable(mode) ? mode : executableMode),
    name: 'cli executable',
  },
  {
    appliesTo: isCliFile,
    check: (content: string) => hasNoProcessArgv(content),
    error: 'cli must not read process.argv, parse the arguments with cac instead (https://github.com/cacjs/cac)',
    name: 'cli arguments',
  },
  {
    appliesTo: isShellFile,
    check: (_content: string, _filePath = '', mode = 0) => isExecutable(mode),
    error: 'shell script must be executable (chmod +x)',
    modeFixer: (mode: number) => (isExecutable(mode) ? mode : executableMode),
    name: 'sh executable',
  },
]
