
const mergeUnique = (array: string[]): string[] => [...new Set(array)]

export const isolateLines = (list: string): string => {
  let lines = list.replace(/ /g, '').split('\n')
  lines = mergeUnique(lines)
  lines = lines.filter(line => line.length > 0)
  lines = lines.sort()
  return lines.join('\n\n').trim()
}
