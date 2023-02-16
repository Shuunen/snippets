import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { parseJson } from 'shuutils'
import { fileURLToPath } from 'url'
import { logger, replaceAndCheck, replaceAndCheckById } from './repo-banner.utils.js'

// usage : ts-node-esm one-file/repo-banner.cli.ts

const thisFilePath = fileURLToPath(import.meta.url)
const thisFileFolder = path.dirname(thisFilePath)
const currentWorkingFolder = process.cwd()
logger.info('Repo banner generator start @', new Date().toLocaleString())
logger.info('Generator folder :', thisFileFolder)
logger.info('Target folder :', currentWorkingFolder)

/**
 * Data extraction
 */
interface PackageJson {
  name: string
  description: string
}
const defaults = { color: '#024eb8', scope: 'JohnDoe', name: 'unknown', description: 'A placeholder description' }
const rawJson = readFileSync(path.join(currentWorkingFolder, 'package.json'), 'utf8')
const { error, value: packageJson } = parseJson<PackageJson>(rawJson)
if (error) { logger.error(error); process.exit(1) }
// eslint-disable-next-line etc/no-assign-mutated-array
const scopeAndName = /\.com\/(?<scope>[^/]+)\/(?<name>[\w-]+)/iu.exec(rawJson)?.groups
const name = scopeAndName?.name ?? packageJson.name.split('/').reverse()[0] ?? defaults.name
const scope = scopeAndName?.scope ?? defaults.scope
if (name === defaults.name) logger.error('Could not find a name for the project, using the default one :', name)
const { description = defaults.description } = packageJson
if (description === defaults.description) logger.error('Could not find a description for the project, using the default one :', description)
// eslint-disable-next-line security/detect-unsafe-regex, unicorn/no-unsafe-regex
const color = /#(?:[\da-f]{3}){1,2}/iu.exec(rawJson)?.[0] ?? defaults.color
if (color === defaults.color) logger.warn('Could not find a color for the project, using the default one :', color)
const data = { color, scope, name, description }

/**
 * SVG generation
 */
logger.info('Generating the SVG code with data :')
logger.info('- scope :', data.scope)
logger.info('- name :', data.name)
logger.info('- description :', data.description)
logger.info('- color :', data.color)
const svgTemplate = readFileSync(path.join(thisFileFolder, 'repo-banner.template.svg'), 'utf8')
let svg = replaceAndCheck(svgTemplate, /(?<before>: )(?<content>#f{6})(?<after>[\d]*")/gu, data.color)
svg = replaceAndCheckById(svg, 'projectName', data.name)
svg = replaceAndCheckById(svg, 'projectScope', data.scope)
svg = replaceAndCheckById(svg, 'projectDescription', data.description)
logger.info('SVG code prepared, writing to file...')
const outFile = `${name}-banner.svg`
writeFileSync(outFile, svg)
logger.test(true, 'SVG code written to', outFile)

