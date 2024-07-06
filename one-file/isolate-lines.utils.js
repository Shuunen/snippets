/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable jsdoc/require-returns */

/**
 * Merges an array of strings into a new array with unique values
 * @param {string[]} array the array to merge
 */
function mergeUnique (array) {
  return [...new Set(array)]
}

/**
 * Isolates lines from a string, removes duplicates and sorts them
 * @param {string} list the list
 */
export function isolateLines (list) {
  let lines = list.replace(/ /gu, '').split('\n')
  lines = mergeUnique(lines)
  lines = lines.filter((line) => line.length > 0)
  return lines.toSorted((lineA, lineB) => lineA.localeCompare(lineB))
}

/**
 * Converts an array of strings into a single string with line breaks
 * @param {string[]} lines the lines
 */
export function linesToList (lines) {
  return lines.join('\n\n').trim()
}
