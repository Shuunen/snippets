/* c8 ignore start */
import { readdirSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blue, ellipsis, green, isTestEnvironment, red, slugify, yellow } from 'shuutils'

// Use me like : node ~/Projects/github/snippets/one-file/check-screens.cli.js "/u/Screens/"

const parameters = process.argv
const expectedNbParameters = 2
if (parameters.length <= expectedNbParameters) console.log('Targeting current folder, you can also specify a specific path, ex : node one-file/check-screens.cli.js "U:\\Screens\\" \n')
const screensPath = path.normalize(parameters[expectedNbParameters] ?? process.cwd())
const shouldShowFirst = parameters.includes('--first')
const isImage = /\.(?:jpg|png)$/u
const colors = [red, green, blue, yellow]
let colorIndex = 0
const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const nbSpaces = 2

/**
 * Colorize a text
 * @param {string} text the text to colorize
 * @returns {string} the colorized text
 */
function color (text) {
  colorIndex = (colorIndex + 1) % colors.length
  return colors[colorIndex]?.(text) ?? text
}

/**
 * Rename a file if badly named
 * @param {string} name the file name, like "Taxi_1998.DVDRip.jpg"
 * @returns {string} the group name, like "Taxi 1998 DVDRip.jpg"
 */
function renameIfNecessary (name) {
  const baseName = path.basename(name)
  const extensionName = path.extname(baseName)
  const nameWithoutExtension = baseName.slice(0, -extensionName.length)
  const cleanName = nameWithoutExtension
    .replace(/[_.]/gu, ' ')
    .replace(/\((?<year>\d{4})\)/gu, ' $<year> ')
    .replace('!qB', ' ')
    .replace(/(?<letter>[a-zA-Z0-9])(?<bracket>\[|\()/gu, '$<letter> $<bracket>')
    .replace(/ +/gu, ' ') + extensionName
  if (baseName === cleanName || isTestEnvironment()) return cleanName
  console.log(`Renaming : \n - ${red(name)}\nto : \n - ${green(cleanName)}\n`)
  renameSync(path.join(screensPath, name), path.join(screensPath, cleanName))
  return cleanName
}

/**
 * Generate a group name from a file name
 * @param {string} name the file name
 * @returns {string} the group name
 */
function getGroupFromName (name) {
  const cleanName = renameIfNecessary(name)
  const slugs = slugify(cleanName).split('-')
  if (slugs[0] === undefined) throw new Error(`No first slug found for ${cleanName}`)
  if (slugs[1] === undefined) throw new Error(`No second slug found for ${cleanName}`)
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const isShort = slugs[0].length <= 5 && /\d{4}/u.test(slugs[1]) // short like "Taxi 1998"
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const minLength = isShort ? 8 : 10 // hard to increase, like below comment
  const maxSlugs = 2 // dont increase this because after slugs n°3 it's not relevant, this will be specific to the release
  if (slugs.slice(0, maxSlugs).join('-').length > minLength) return slugs.slice(0, maxSlugs).join('-')
  return slugs.slice(0, maxSlugs + 1).join('-')
}

/**
 * Get files
 * @returns {string[]} list of files
 */
function getFiles () {
  console.log(`Scanning dir ${screensPath}...\n`)
  const files = readdirSync(screensPath).filter(name => isImage.test(name))
  console.log(`Found ${files.length} files`)
  if (shouldShowFirst) console.log('First file is :', ellipsis(files[0]))
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
function getGroups (files) {
  /** @type {Groups} */
  const groups = {}
  for (const file of files) {
    const group = getGroupFromName(file)
    if (!groups[group]) groups[group] = []
    groups[group].push(file)
  }
  return groups
}

/**
 * Get the number of singles
 * @param {Groups} groups the groups to get singles from
 * @returns {number} the number of singles found
 */
function getSingles (groups) {
  let singles = 0
  for (const [group, names] of Object.entries(groups))
    if (names.length === 1) {
      console.log(`\nGroup ${group} has only one file name : ${color(names[0] ?? 'undefined')}`)
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
function report (groups, singles) {
  if (singles === 0) console.log(`\n${color('No')} screenshot seems to be alone, ${color('well done ^^')}`)
  else console.log(`\nFound ${color(singles.toString())} screenshot(s) that seems to be alone`)
  writeFileSync(path.join(currentFolder, 'check-screens.json'), JSON.stringify(groups, undefined, nbSpaces))
}

/**
 *
 */
function start () {
  console.log('\nCheck screens is starting !\n')
  const files = getFiles()
  const groups = getGroups(files)
  const singles = getSingles(groups)
  report(groups, singles)
}

start()
