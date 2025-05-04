import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

/**
 * Get the filename from a filepath
 * @param {string} filepath the filepath to get the filename from
 * @returns {string} the filename
 * @example filename('C:\\Users\\me\\file.txt') // 'file.txt'
 */
export function filename(filepath = '') {
  return /[/\\](?<name>[\w.-]+)$/u.exec(filepath)?.groups?.name ?? ''
}

/**
 * Remove lines matching a regexp list
 * @param {string} content the content to clean
 * @param {RegExp[]} regexList the regex list to match
 * @returns {string} the cleaned content
 */
export function removeLinesMatching(content, regexList) {
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
export function removeLinesAfter(content, regex) {
  const lines = content.split('\n')
  const index = lines.findIndex(line => regex.test(line))
  if (index === -1) return content.trim()
  return lines.slice(0, index).join('\n').trim()
}

/**
 * Convert carriage return to unix line endings
 * @param {string} content the content to be processed
 * @returns the processed content with unix line endings
 */
export function useUnixCarriageReturn(content) {
  return content.replace(/\r\n/gu, '\n')
}

/**
 * Clean a file details content
 * @param {string} content the file content to clean
 * @param {RegExp} [linesAfter] a regex to remove lines after
 * @param {RegExp[]} [linesMatching] a list of regex to remove lines matching
 * @param shouldClearSpaces if true will also clear spaces
 * @returns {string} the cleaned file content
 */
// eslint-disable-next-line @typescript-eslint/max-params
export function clean(content, linesAfter, linesMatching, shouldClearSpaces = true) {
  if (!content) return ''
  let output = content
  if (linesAfter) output = removeLinesAfter(output, linesAfter)
  if (linesMatching) output = removeLinesMatching(output, linesMatching)
  if (shouldClearSpaces) output = output.replace(/\s*/gu, '')
  return output
}

/* c8 ignore start */

/**
 * Normalize a filepath with slash style
 * @param {string} filepath the filepath
 * @param {boolean} shouldUseTilde use tilde will replace the home directory with ~
 * @param {string} home the home directory path
 * @returns the normalized path
 */
export function normalizePathWithSlash(filepath, shouldUseTilde = false, home = process.env.HOME ?? '') {
  let outPath = path.normalize(filepath).replace(/\\/gu, '/')
  if (shouldUseTilde) outPath = outPath.replace(normalizePathWithSlash(home), '~')
  return outPath
}

/**
 * Copy a file
 * @param {string} source the source file
 * @param {string} destination the destination file
 * @returns {Promise<boolean>} some bool result; i dont know im in the train to Paris
 */
export async function copy(source, destination) {
  // destination will be created or overwritten by default.
  const destinationFolder = destination.replace(filename(destination), '')
  // eslint-disable-next-line @typescript-eslint/naming-convention
  await mkdir(destinationFolder, { recursive: true })

  return copyFile(source, destination)
    .then(() => true)
    .catch(error => {
      console.log(error)
      return false
    })
}
/* c8 ignore stop */
