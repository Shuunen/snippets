
function mergeUnique (array: string[]): string[] {
  // eslint-disable-next-line array-func/prefer-array-from
  return [...new Set(array)]
}

export function isolateLines (list: string): string {
  let lines = list.replace(/ /gu, '').split('\n')
  lines = mergeUnique(lines)
  lines = lines.filter(line => line.length > 0)
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare, etc/no-assign-mutated-array
  lines = lines.sort()
  return lines.join('\n\n').trim()
}
