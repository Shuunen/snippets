/**
 * Merges an array of strings into a new array with unique values
 * @param {string[]} array the array to merge
 * @returns {string[]} a new array with unique values
 */
function mergeUnique(array) {
  return [...new Set(array)]
}

/**
 * Isolates lines from a string, removes duplicates and sorts them
 * @param {string} list the list
 * @returns {string[]} the isolated and sorted lines
 */
export function isolateLines(list) {
  let lines = list.replaceAll(' ', '').split('\n')
  lines = mergeUnique(lines)
  lines = lines.filter(line => line.length > 0)
  return lines.toSorted((lineA, lineB) => lineA.localeCompare(lineB))
}

/**
 * Converts an array of strings into a single string with line breaks
 * @param {string[]} lines the lines
 * @returns {string} the list as a string with line breaks
 */
export function linesToList(lines) {
  return lines
    .map(line => line.trim())
    .join('\n\n')
    .trim()
}
