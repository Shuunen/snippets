
function mergeUnique (array: string[]) {
  // eslint-disable-next-line array-func/prefer-array-from
  return [...new Set(array)]
}

export function isolateLines (list: string) {
  let lines = list.replace(/ /gu, '').split('\n')
  lines = mergeUnique(lines)
  lines = lines.filter(line => line.length > 0)
  // eslint-disable-next-line etc/no-assign-mutated-array
  return lines.sort()
}

export function linesToList (lines: string[]) {
  return lines.join('\n\n').trim()
}
