// cSpell:disable

const regexH1 = /^#\s+.+$/gm
const regexCodeBlock = /^```[\s\S]*?^```[ \t]*$/gmu

function stripCodeBlocks(content: string): string {
  return content.replace(regexCodeBlock, '')
}

export type Rule = {
  check: (content: string, filePath?: string) => boolean
  error: string
  fixer?: (content: string, filePath: string) => string
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
  const baseName = filePath.split('/').at(-1)?.replace('.md', '') ?? ''
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(baseName)
}

function normalizeContent(content: string): string {
  return `${content.replaceAll('\r\n', '\n').replaceAll(/\n+$/g, '')}\n`
}

export const rules: Rule[] = [
  {
    check: (content: string) => hasOneH1(content),
    error: 'must contain exactly one first-level title (#)',
    name: 'single H1',
  },
  {
    check: (content: string) => hasContent(content),
    error: 'must have content beyond the title',
    name: 'has content',
  },
  {
    check: (content: string) => hasNoTodos(content),
    error: 'contains TODO, TBD, or placeholder text — please complete or remove',
    name: 'no todos',
  },
  {
    check: (_content: string, filePath = '') => isKebabCaseFilename(filePath),
    error: 'filename must be lowercase kebab-case (e.g. my-manual.md)',
    fixer: (content: string) => normalizeContent(content),
    name: 'kebab-case filename',
  },
]
