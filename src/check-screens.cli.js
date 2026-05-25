/* v8 ignore start */
import { readdirSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { blue, ellipsis, green, isTestEnvironment, Logger, red, slugify, yellow } from 'shuutils'

// Use me like : node ~/Projects/github/snippets/src/check-screens.cli.js "/u/Screens/"

const parameters = process.argv
const expectedNbParameters = 2
const logger = new Logger()
if (parameters.length <= expectedNbParameters) logger.info('Targeting current folder, you can also specify a specific path, ex : node src/check-screens.cli.js "U:\\Screens\\" \n')
const screensPath = path.normalize(parameters[expectedNbParameters] ?? process.cwd())
const shouldShowFirst = parameters.includes('--first')
const regex = {
  image: /\.(?:jpg|png)$/u,
  letterBracket: /(?<letter>[a-zA-Z0-9])(?<bracket>\[|\()/gu,
  qb: /!qB/,
  shortYear: /\d{4}/u,
  spaces: / +/gu,
  underscoreOrDot: /[_.]/gu,
  yearInParens: /\((?<year>\d{4})\)/gu,
}
const isImage = regex.image
const colors = [red, green, blue, yellow]
let colorIndex = 0
const currentFolder = import.meta.dirname
const nbSpaces = 2

/**
 * Colorize a text
 * @param {string} text the text to colorize
 * @returns {string} the colorized text
 */
function color(text) {
  colorIndex = (colorIndex + 1) % colors.length
  return colors[colorIndex]?.(text) ?? text
}

/**
 * Rename a file if badly named
 * @param {string} name the file name, like "Taxi_1998.DVDRip.jpg"
 * @returns {string} the group name, like "Taxi 1998 DVDRip.jpg"
 */
function renameIfNecessary(name) {
  const baseName = path.basename(name)
  const extensionName = path.extname(baseName)
  const nameWithoutExtension = baseName.slice(0, -extensionName.length)
  const cleanName = nameWithoutExtension.replace(regex.underscoreOrDot, ' ').replace(regex.yearInParens, ' $<year> ').replace(regex.qb, ' ').replace(regex.letterBracket, '$<letter> $<bracket>').replace(regex.spaces, ' ') + extensionName
  if (baseName === cleanName || isTestEnvironment()) return cleanName
  logger.info(`Renaming : \n - ${red(name)}\nto : \n - ${green(cleanName)}\n`)
  renameSync(path.join(screensPath, name), path.join(screensPath, cleanName))
  return cleanName
}

/**
 * Generate a group name from a file name
 * @param {string} name the file name
 * @returns {string} the group name
 */
function getGroupFromName(name) {
  const cleanName = renameIfNecessary(name)
  const slugs = slugify(cleanName).split('-')
  if (slugs[0] === undefined) throw new Error(`No first slug found for ${cleanName}`)
  if (slugs[1] === undefined) throw new Error(`No second slug found for ${cleanName}`)
  // oxlint-disable-next-line no-magic-numbers
  const isShort = slugs[0].length <= 5 && regex.shortYear.test(slugs[1]) // short like "Taxi 1998"
  // oxlint-disable-next-line no-magic-numbers
  const minLength = isShort ? 8 : 10 // hard to increase, like below comment
  const maxSlugs = 2 // dont increase this because after slugs n°3 it's not relevant, this will be specific to the release
  if (slugs.slice(0, maxSlugs).join('-').length > minLength) return slugs.slice(0, maxSlugs).join('-')
  return slugs.slice(0, maxSlugs + 1).join('-')
}

/**
 * Get files
 * @returns {string[]} list of files
 */
function getFiles() {
  logger.info(`Scanning dir ${screensPath}...\n`)
  const files = readdirSync(screensPath).filter(name => isImage.test(name))
  logger.info(`Found ${files.length} files`)
  if (shouldShowFirst) logger.info('First file is :', ellipsis(files[0]))
  return files
}

/**
 * @typedef {Record<string, string[]>} Groups
 */

/**
 * Group files by group name
 * @param {string[]} files the files to group
 * @returns {Groups} the groups
 */
function getGroups(files) {
  /** @type {Groups} */
  const groups = {}
  for (const file of files) {
    const group = getGroupFromName(file)
    groups[group] ??= []
    groups[group].push(file)
  }
  return groups
}

/**
 * Get the number of singles
 * @param {Groups} groups the groups to get singles from
 * @returns {number} the number of singles found
 */
function getSingles(groups) {
  let singles = 0
  for (const [group, names] of Object.entries(groups))
    if (names.length === 1) {
      logger.info(`\nGroup ${group} has only one file name : ${color(names[0] ?? 'undefined')}`)
      singles += 1
    }
  return singles
}

/**
 * Report the number of singles
 * @param {Groups} groups the groups checked
 * @param {number} singles the number of singles found
 * @returns {void}
 */
function report(groups, singles) {
  if (singles === 0) logger.info(`\n${color('No')} screenshot seems to be alone, ${color('well done ^^')}`)
  else logger.info(`\nFound ${color(singles.toString())} screenshot(s) that seems to be alone`)
  writeFileSync(path.join(currentFolder, 'check-screens.local.json'), JSON.stringify(groups, undefined, nbSpaces))
}

/**
 *
 */
function start() {
  logger.info('\nCheck screens is starting !\n')
  const files = getFiles()
  const groups = getGroups(files)
  const singles = getSingles(groups)
  report(groups, singles)
}

start()
