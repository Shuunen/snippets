// oxlint-disable import/no-nodejs-modules
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

function addColorCode(from: number, to: number, string: string) {
  return `[${from}m${string}[${to}m`
}

function yellow(string: string) {
  // oxlint-disable-next-line no-magic-numbers
  return addColorCode(33, 39, string)
}

function injectMark(content: string, placeholder: string, mark: string) {
  return content
    .replaceAll(new RegExp(`__${placeholder}__`, 'gu'), mark)
    .replaceAll(new RegExp(`\\{{1,2} ?${placeholder} ?\\}{1,2}`, 'gu'), mark)
    .replace(new RegExp(`(<[a-z.]+\\b[^>]*id="${placeholder}"[^>]*>)[^<]*(</[a-z.]+>)`, 'u'), (_m, g1: string, g2: string) => `${g1}${mark}${g2}`)
    .replace(new RegExp(`(<meta\\b[^>]*name="${placeholder}"[^>]*content=")[^"]*(")`, 'u'), (_m, g1: string, g2: string) => `${g1}${mark}${g2}`)
    .replace(new RegExp(`(<meta\\b[^>]*content=")[^"]*(" [^>]*name="${placeholder}")`, 'u'), (_m, g1: string, g2: string) => `${g1}${mark}${g2}`)
    .replace(new RegExp(`(\\w+\\.jsx\\([^,]+,\\{[^}]*id:"${placeholder}"[^}]*)(\\})`, 'u'), (_m, g1: string, g2: string) => `${g1},children:"${mark}"${g2}`)
}

function generateMark({ commit = '', date = new Date(), version = '' }: { commit?: string; date?: Date; version?: string }) {
  let finalCommit = commit
  const readableDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replace(',', '')
  /* v8 ignore start */
  if (commit === '')
    try {
      finalCommit = execSync('git rev-parse --short HEAD', { cwd: process.cwd() }).toString().trim()
    } catch {
      finalCommit = 'no-git-commit'
    }

  /* v8 ignore stop */
  return `${version} - ${finalCommit} - ${readableDate}`
}

function injectMarkInAsset({ asset, fileName, mark, placeholder }: { asset: Record<string, string>; fileName: string; mark: string; placeholder: string }) {
  const firstLine = fileName.endsWith('.html') ? '' : `/* ${placeholder} : ${mark} */\n`
  const contentKey = fileName.endsWith('.js') ? 'code' : 'source'
  /* v8 ignore start */
  if (asset[contentKey] === undefined) {
    console.warn(yellow(`Warning /!\\ no content found for ${fileName}, skipping mark injection.`))
    return
  }
  /* v8 ignore stop */
  const oldContent = asset[contentKey]
  /* v8 ignore start */
  if (typeof oldContent !== 'string') return
  /* v8 ignore stop */
  const newContent = injectMark(oldContent, placeholder, mark)
  if (oldContent.includes(placeholder) && !newContent.includes(mark)) console.warn(yellow(`Warning /!\\ some "${placeholder}" placeholder have not been replaced in ${fileName}.`))
  asset[contentKey] = `${firstLine}${newContent}`
}

function injectMarkInAssets(assets: Record<string, Record<string, string>>, placeholder: string, version: string) {
  const mark = generateMark({ version })
  console.log('Injecting unique mark into HTML, JS, and CSS files...')
  const targets = Object.keys(assets).filter(fileName => fileName.endsWith('.html') || fileName.endsWith('.js') || fileName.endsWith('.css'))
  for (const fileName of targets) {
    const asset = assets[fileName]
    /* v8 ignore start */
    if (asset === undefined) {
      console.warn(yellow(`Warning /!\\ asset for ${fileName} is undefined, skipping mark injection.`))
      continue
    }
    /* v8 ignore stop */
    injectMarkInAsset({ asset, fileName, mark, placeholder })
  }
  console.log(`Mark potentially injected into ${targets.length} files`)
}

/* v8 ignore start */
function getProjectVersion(projectRoot: string) {
  try {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as { version?: string }
    return pkg.version ?? ''
  } catch (error) {
    if (error instanceof Error) console.error('Could not read project package.json for version', error.message)
    return ''
  }
}
/* v8 ignore stop */

export function uniqueMark(options: { placeholder?: string } = {}): Plugin {
  const placeholder = options.placeholder ?? 'unique-mark'
  let projectRoot = ''
  let projectVersion = ''
  return {
    apply: 'build',
    configResolved(config) {
      projectRoot = config.root
      projectVersion = getProjectVersion(projectRoot)
    },
    enforce: 'post',
    generateBundle(_options, bundle) {
      injectMarkInAssets(bundle as unknown as Record<string, Record<string, string>>, placeholder, projectVersion)
    },
    name: 'vite-plugin-unique-mark',
  }
}
