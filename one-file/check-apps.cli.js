/* c8 ignore start */
import sevenZip from '7zip-min'
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Logger, blue, green, nbPercentMax, nbThird, red, yellow } from 'shuutils'

// Use me like : node ~/Projects/github/snippets/one-file/check-apps.cli.js "/d/Apps/"

/**
 * @typedef {Record<string, string[]>} Groups
 */

const parameters = process.argv
const expectedNbParameters = 2
const logger = new Logger({ willOutputToMemory: true })
if (parameters.length <= expectedNbParameters) logger.info(String.raw`Targeting current folder, you can also specify a specific path, ex : node one-file/check-screens.cli.js "U:\Screens\"`)
const appsPath = path.normalize(parameters[expectedNbParameters] ?? process.cwd())
const colors = [red, green, blue, yellow]
let colorIndex = 0
const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const nbSpaces = 2
const archivesExtensions = new Set(['7z', 'exe', 'rar', 'zip'])
const readableExtensions = new Set(['7z', 'zip'])

/**
 * Calculate the similarity between two strings
 * @copyright 2018 Akash Kurdekar - MIT - https://github.com/aceakash/string-similarity
 * @param {string} firstString the first string
 * @param {string} secondString the second string
 * @returns {number} the similarity between the two strings
 */
// eslint-disable-next-line max-statements, complexity
function stringsSimilarity (firstString, secondString) {
  const first = firstString.replace(/\s+/gu, '')
  const second = secondString.replace(/\s+/gu, '')
  if (first === second) return 1 // identical or empty
  if (first.length < nbThird || second.length < nbThird) return 0 // if either is a 0-letter or 1-letter string
  /** @type {Map<string, number>} */
  const firstSet = new Map()
  for (let index = 0; index < first.length - 1; index += 1) {
    const key = first.slice(index, index + nbThird)
    const count = firstSet.has(key) ? firstSet.get(key) ?? 0 + 1 : 1
    firstSet.set(key, count)
  };
  let intersectionSize = 0
  for (let index = 0; index < second.length - 1; index += 1) {
    const key = second.slice(index, index + nbThird)
    const count = firstSet.has(key) ? firstSet.get(key) ?? 0 : 0
    if (count > 0) {
      firstSet.set(key, count - 1)
      intersectionSize += 1
    }
  }
  const similarity = (nbThird * intersectionSize) / (first.length + second.length - nbThird) // like 0.7058823529411765
  return Math.round(similarity * nbPercentMax) / nbPercentMax // like 0.71
}

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
 * Check if a name is a file
 * @param {string} name the name to check, like "Clavier.Plus.Plus_108.exe", "AviDeMux_280.7z" or "Uni.Extract_200_2024-11"
 * @returns {boolean} true if the name is a file
 */
function isFile (name) {
  return statSync(path.join(appsPath, name)).isFile()
}

/**
 * Get the extension of a (presumed) file name
 * @param {string} name the name to get the extension from, like "Clavier.Plus.Plus_108.exe", "AviDeMux_280.7z" or "Uni.Extract_200_2024-11" (folder)
 * @returns {string} the extension, like "exe", "7z" or ""
 */
function getExtension (name) {
  if (!isFile(name)) return ''
  const extension = path.extname(name).replace('.', '')
  return extension
}

/**
 * Generate a group name from a file name
 * @param {string} name the file name, like "Clavier.Plus.Plus_108.exe", "AviDeMux_280.7z" or "Uni.Extract_200_2024-11"
 * @returns {string} the group name
 */
function getGroupFromName (name) {
  const extension = getExtension(name) // like "exe", "7z" or ""
  const baseName = extension === "" ? name : name.replace(`.${extension}`, '') // like "Clavier.Plus.Plus_108", "AviDeMux_280" or "Uni.Extract_200_2024-11"
  return baseName
}

/**
 * Check if a name should be checked
 * @param {string} name the name to check, like "Clavier.Plus.Plus_108.exe", "AviDeMux_280.7z" or "Uni.Extract_200_2024-11"
 * @returns {boolean} true if the name should be checked
 */
function shouldCheck (name) {
  const extension = getExtension(name) // like "exe", "7z" or ""
  if (extension === '') return true // we want to check folders
  const isValid = archivesExtensions.has(extension)
  if (isValid) {
    if (extension === 'rar') logger.warn(`Use 7z instead of ${color(extension)} for ${color(name)}`)
    return true  // we want to check these archives files
  }
  logger.debug(`Ignoring : ${color(name)}`, { extension, name })
  return false
}

/**
 * Get files
 * @returns {string[]} list of files
 */
function getFiles () {
  logger.info(`Scanning dir ${appsPath}...`)
  const files = readdirSync(appsPath).filter(name => shouldCheck(name))
  logger.info(`Found ${files.length} files`)
  return files
}

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
  writeFileSync(path.join(currentFolder, 'check-apps.json'), JSON.stringify(groups, undefined, nbSpaces))
  return groups
}

/**
 * Check if two group names are too close
 * @param {string[]} groupNames the groups names to check
 * @param {string} groupName the group name to check
 */
function checkCloseName (groupNames, groupName) {
  const minSimilarity = 0.65
  for (const groupNameA of groupNames) {
    if (groupName === groupNameA) continue
    if (groupName.startsWith('_')) continue
    const nameA = groupNameA.split('_')[0] ?? ''
    const nameB = groupName.split('_')[0] ?? ''
    const similarity = stringsSimilarity(nameA, nameB)
    if (similarity >= minSimilarity) logger.warn(`${similarity * nbPercentMax}% similar : ${color(groupName)} and ${color(groupNameA)}`)
  }
}

/**
 * Check an archive for containing the same name, like "Clavier.Plus.Plus_108.7z" should contain a "Clavier.Plus.Plus_108" folder
 * @param {string} archive the archive to check, like "Clavier.Plus.Plus_108.7z"
 * @returns {Promise<void>} a promise that resolves to true if the archive contains the same name
 */
async function checkArchive (archive) {
  const pathToArchive = path.join(appsPath, archive)
  const extension = getExtension(archive)
  if (!readableExtensions.has(extension)) return
  const expectedFolder = archive.replace(`.${extension}`, '')
  return new Promise((resolve) => {
    sevenZip.list(pathToArchive, (error, content) => {
      if (error) logger.error(`Error while listing ${color(archive)}`, error)
      const firstFolder = content.find(item => ['D', 'DA'].includes(item.attr))
      if (firstFolder === undefined) logger.error(`Failed to find a folder in : ${color(archive)}`)
      else logger.debug(`${archive} content`, firstFolder)
      const isValid = firstFolder?.name === expectedFolder
      if (!isValid && firstFolder) logger.warn(`Found ${color(firstFolder.name)} instead of ${color(expectedFolder)} in ${color(archive)}`)
      if (!isValid) writeFileSync(path.join(currentFolder, `check-apps-error-${expectedFolder}.json`), JSON.stringify(content, undefined, nbSpaces))
      resolve()
    })
  })
}

/**
 * Check if a group has a missing archive
 * @param {string[]} items the items to check, like ["Clavier.Plus.Plus_108" (folder), "Clavier.Plus.Plus_108.exe", "Clavier.Plus.Plus_108.7z"]
 * @param {string} groupName the group name to check, like "Clavier.Plus.Plus_108"
 */
async function checkMissingArchive (items, groupName) {
  if (groupName.startsWith('_')) return
  const archive = items.find(item => archivesExtensions.has(getExtension(item)))
  if (archive === undefined) logger.warn(`Missing archive for ${color(groupName)}`)
  else await checkArchive(archive)
  const maxItems = 2 // one folder and one archive
  if (items.length > maxItems) logger.warn(`Too many archives for ${color(groupName)}`)
}

const invalidCharsRegex = /(?<invalid>[^a-zA-Z0-9._-])/u
const nameFormatRegex = /_(?<date>Final|20\d\d-\d\d)$/u
const invalidVersionRegex = /[\b_](?<invalid>\d+\.\d*\.?\d*)/u

/**
 * Check the name format
 * @param {string} name the group name to check, like "Clavier.Plus.Plus_108"
 */
// eslint-disable-next-line complexity, max-statements
function checkNameFormat (name) {
  if (name.startsWith('_')) return
  const parts = name.split('_')
  const minParts = 2
  if (parts.length < minParts) logger.warn(`Invalid name : ${color(name)}, missing version and/or a date`)
  if (name.includes(' ')) logger.warn(`Invalid name : ${color(name)}, spaces are not allowed`)
  const invalidChar = invalidCharsRegex.exec(name)?.groups?.invalid
  if (invalidChar !== undefined) logger.warn(`Invalid chars in : ${color(name)}, found : ${color(invalidChar)}`)
  const invalidVersion = invalidVersionRegex.exec(name)?.groups?.invalid
  if (invalidVersion !== undefined) logger.warn(`Invalid version in : ${color(name)}, found : ${color(invalidVersion)}`)
  const date = nameFormatRegex.exec(name)?.groups?.date
  if (date === undefined) logger.warn(`Missing date in : ${color(name)}, should be like ${name}_2042-11`)
}

/**
 * Check the groups
 * @param {Groups} groups the groups to check
 */
async function checkGroups (groups) {
  const groupNames = Object.keys(groups)
  for (const groupName of groupNames) {
    checkNameFormat(groupName)
    checkCloseName(groupNames, groupName)
    const items = groups[groupName] ?? []
    if (items.length === 0) {
      logger.warn(`Empty group : ${color(groupName)}`)
      continue
    }
    // eslint-disable-next-line no-await-in-loop
    await checkMissingArchive(items, groupName)
  }
}


/**
 * Start the check
 */
async function start () {
  logger.info('Check apps is starting !')
  const files = getFiles()
  const groups = getGroups(files)
  await checkGroups(groups)
  const nbWarnings = logger.inMemoryLogs.filter(log => log.includes('warn')).length
  if (nbWarnings === 0) logger.success('No warning found ( ͡° ͜ʖ ͡°)')
  else logger.warn(`${nbWarnings} warnings found ಠ_ಠ`)
  logger.info(`Check apps is done`)
}

await start()
