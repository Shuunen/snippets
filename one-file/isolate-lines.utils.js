
/**
 * Merges an array of strings into a new array with unique values
 * @param {string[]} array
 */
function mergeUnique (array) {
  // eslint-disable-next-line array-func/prefer-array-from
  return [...new Set(array)]
}

/**
 * Isolates lines from a string, removes duplicates and sorts them
 * @param {string} list
 */
export function isolateLines (list) {
  let lines = list.replace(/ /gu, '').split('\n')
  lines = mergeUnique(lines)
  lines = lines.filter((line) => line.length > 0)
  return lines.sort()
}

/**
 * Converts an array of strings into a single string with line breaks
 * @param {string[]} lines
 */
export function linesToList (lines) {
  return lines.join('\n\n').trim()
}
