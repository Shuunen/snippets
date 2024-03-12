/* c8 ignore start */
import { readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blue, ellipsis, green, red, slugify, yellow } from 'shuutils'

// Use me like : node ~/Projects/github/snippets/one-file/check-screens.cli.js "/u/Screens/"

const parameters = process.argv
const expectedNbParameters = 2
if (parameters.length <= expectedNbParameters) console.log('Targeting current folder, you can also specify a specific path, ex : node one-file/check-screens.cli.js "U:\\Screens\\" \n')
const screensPath = path.normalize(parameters[expectedNbParameters] ?? process.cwd())
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
 * Generate a group name from a file name
 * @param {string} name the file name
 * @returns {string} the group name
 */
function getGroupFromName (name) {
  const slugs = slugify(name.replace(/[_.]/gu, ' ')).split('-')
  const minLength = 8 // increase this to be more precise
  const maxSlugs = 2
  if (slugs.slice(0, maxSlugs).join('-').length > minLength) return slugs.slice(0, maxSlugs).join('-')
  return slugs.slice(0, maxSlugs + 1).join('-')
}

function getFiles () {
  console.log(`Scanning dir ${screensPath}...`)
  const files = readdirSync(screensPath).filter(name => isImage.test(name))
  console.log(`Found ${files.length} files`)
  console.log('First file is :', ellipsis(files[0]))
  return files
}

/**
 * @typedef {Record<string, string[]>} Groups
 */

/**
 * Group files by group name
 * @param {string[]} files the files to group
 * @returns
 */
function getGroups (files) {
  /** @type {Groups} */
  const groups = {}
  for (const file of files) {
    const group = getGroupFromName(file)
    if (!groups[group]) groups[group] = []
    groups[group]?.push(file)
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

function start () {
  console.log('\nCheck Videos is starting !\n')
  const files = getFiles()
  const groups = getGroups(files)
  const singles = getSingles(groups)
  report(groups, singles)
}

start()
