/* c8 ignore start */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { extractData, logger, replaceAndCheck, replaceAndCheckById } from './repo-banner.utils.js'

// usage : node one-file/repo-banner.cli.js

const thisFileFolder = import.meta.dirname
logger.info('Repo banner generator start @', new Date().toLocaleString())
logger.info('Generator folder :', thisFileFolder)
logger.info('Target folder :', process.cwd())

const { color, description, name, scope } = extractData()
logger.info('Generating the SVG code with data :')
logger.info('- scope :', scope)
logger.info('- name :', name)
logger.info('- description :', description)
logger.info('- color :', color)
const svgTemplate = readFileSync(path.join(thisFileFolder, 'repo-banner.template.svg'), 'utf8')
let svg = replaceAndCheck(svgTemplate, /(?<before>: )(?<content>#f{6})(?<after>\d*")/gu, color)
svg = replaceAndCheckById(svg, 'projectName', name)
svg = replaceAndCheckById(svg, 'projectScope', scope)
svg = replaceAndCheckById(svg, 'projectDescription', description)
logger.info('SVG code prepared, writing to file...')
const outFile = `${name}-banner.svg`
writeFileSync(outFile, svg)
logger.success('SVG code written to', outFile)
