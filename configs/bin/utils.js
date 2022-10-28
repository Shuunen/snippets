import { copyFile, mkdir } from 'fs/promises'
import path from 'path'

export const filename = (path = '') => (/[/\\]([\w-]*[\w.-]+)$/.exec(path) || [])[1]

/**
 * Clean a file details content
 * @param {string} content the file content to clean
 * @param {RegExp} [linesAfter] a regex to remove lines after
 * @param {RegExp[]} [linesMatching] a list of regex to remove lines matching
 * @returns {string} the cleaned file content
 */
export const clean = (content, linesAfter, linesMatching, clearSpaces = true) => {
  if (!content) return ''
  if (linesAfter) content = removeLinesAfter(content, linesAfter)
  if (linesMatching) content = removeLinesMatching(content, linesMatching)
  if (clearSpaces) content = content.replace(/\s*/g, '')
  return content
}

/**
 * 
 * @param {string} filepath 
 * @param {boolean} useSlash use slash instead of backslash
 * @param {boolean} useTilde use tilde will replace the home directory with ~
 * @param {string} home the home directory path
 * @returns 
 */
export const normalize = (filepath, useSlash = false, useTilde = false, home = process.env['HOME'] ?? '') => {
  let p = path.normalize(filepath)
  if (useSlash) p = p.replace(/\\/g, '/')
  if (useTilde) p = p.replace(normalize(home, useSlash), '~')
  return p
}

/**
 * Remove lines matching a regexp list
 * @param {string} content the content to clean
 * @param {RegExp[]} regexList the regex list to match
 * @returns {string} the cleaned content
 */
export const removeLinesMatching = (content, regexList) => {
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
export const removeLinesAfter = (content, regex) => {
  const lines = content.split('\n')
  const index = lines.findIndex(line => regex.test(line))
  if (index === -1) return content.trim()
  return lines.slice(0, index).join('\n').trim()
}

/**
 * 
 * @param {string} source 
 * @param {string} destination 
 * @returns 
 */
export const copy = async (source, destination) => {
  // destination will be created or overwritten by default.
  const destinationFolder = destination.replace(filename(destination) ?? '', '')
  await mkdir(destinationFolder, { recursive: true })
  return copyFile(source, destination).then(() => true).catch(error => {
    console.log(error)
    return false
  })
}
