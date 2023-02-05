/* eslint-disable max-params */
import { copyFile, mkdir } from 'fs/promises'
import path from 'path'

/**
 * Get the filename from a filepath
 * @param {string} filepath the filepath to get the filename from
 * @returns {string} the filename
 * @example filename('C:\\Users\\me\\file.txt') // 'file.txt'
 */
export function filename (filepath = '') {
  return (/[/\\](?<name>[\w.-]+)$/u.exec(filepath) || {}).groups?.name || ''
}

/**
 * Remove lines matching a regexp list
 * @param {string} content the content to clean
 * @param {RegExp[]} regexList the regex list to match
 * @returns {string} the cleaned content
 */
export function removeLinesMatching (content, regexList) {
  const lines = content.split('\n')
  const filteredLines = lines.filter(line => !regexList.some(regex => regex.test(line)))
  return filteredLines.join('\n').trim()
}

/**
 * Remove lines after a given regex
 * @param {string} content the content to remove lines from
 * @param {RegExp} regex the regexp to match the line after which to remove content
 * @returns {string} the content without the lines after the matching line
 */
export function removeLinesAfter (content, regex) {
  const lines = content.split('\n')
  const index = lines.findIndex(line => regex.test(line))
  // eslint-disable-next-line no-magic-numbers
  if (index === -1) return content.trim()
  return lines.slice(0, index).join('\n').trim()
}

/**
 * Clean a file details content
 * @param {string} content the file content to clean
 * @param {RegExp} [linesAfter] a regex to remove lines after
 * @param {RegExp[]} [linesMatching] a list of regex to remove lines matching
 * @returns {string} the cleaned file content
 */
export function clean (content, linesAfter, linesMatching, clearSpaces = true) {
  if (!content) return ''
  let output = content
  if (linesAfter) output = removeLinesAfter(output, linesAfter)
  if (linesMatching) output = removeLinesMatching(output, linesMatching)
  if (clearSpaces) output = output.replace(/\s*/gu, '')
  return output
}

/**
 * 
 * @param {string} filepath 
 * @param {boolean} useSlash use slash instead of backslash
 * @param {boolean} useTilde use tilde will replace the home directory with ~
 * @param {string} home the home directory path
 * @returns 
 */
export function normalize (filepath, useSlash = false, useTilde = false, home = process.env.HOME ?? '') {
  let outPath = path.normalize(filepath)
  if (useSlash) outPath = outPath.replace(/\\/gu, '/')
  if (useTilde) outPath = outPath.replace(normalize(home, useSlash), '~')
  return outPath
}

/**
 * 
 * @param {string} source 
 * @param {string} destination 
 * @returns 
 */
export async function copy (source, destination) {
  // destination will be created or overwritten by default.
  const destinationFolder = destination.replace(filename(destination) ?? '', '')
  await mkdir(destinationFolder, { recursive: true })
  // eslint-disable-next-line promise/prefer-await-to-then
  return copyFile(source, destination).then(() => true).catch(error => {
    console.log(error)
    return false
  })
}
