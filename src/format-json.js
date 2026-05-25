/* c8 ignore start */
import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const spaces = 2
const expectedNbParameters = 2

/**
 * @param {string} filePath the filepath
 */
function formatFile(filePath) {
  const jsonIn = readFileSync(filePath, 'utf8')
  const jsonOut = `${JSON.stringify(JSON.parse(jsonIn), undefined, spaces)}\n`
  if (jsonIn !== jsonOut) writeFileSync(filePath, jsonOut)
}

/**
 * @param {string} folderPath the folder path
 * @returns the files
 */
function getFiles(folderPath) {
  const stats = lstatSync(folderPath)
  if (stats.isFile()) return [folderPath]
  if (!stats.isDirectory()) throw new Error('path must be a file or folder')
  return readdirSync(folderPath)
    .filter((/** @type {string} */ file) => file.includes('.json'))
    .map((/** @type {string} */ file) => path.join(folderPath, file))
}

/**
 * The path to format
 * @returns {string} the path
 */
function getPath() {
  if (process.argv.length <= expectedNbParameters) throw new Error(String.raw`this script need a path as argument like : format-json.js my-file.json or format-json.js "C:\My Folder\"`)
  return path.normalize(process.argv[expectedNbParameters] ?? '')
}

/**
 *
 */
function start() {
  const folderPath = getPath()
  const files = getFiles(folderPath)
  for (const file of files) formatFile(file)
}

start()
