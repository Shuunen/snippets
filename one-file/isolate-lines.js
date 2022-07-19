#!/usr/bin/env node
const mergeUnique = (array) => [...new Set(array)]

export const isolateLines = (list) => {
  const lines = mergeUnique(list.replace(/ /g, '').split('\n')).filter(line => line.length > 0)
  return lines.sort().join('\n\n').trim()
}

const processClipboard = async () => {
  const clipboard = await import('clipboardy')
  const input = clipboard.default.readSync()
  const output = isolateLines(input)
  /* c8 ignore next */
  console.log('will copy this to clipboard :\n---\n' + output + `\n--- ${Date.now()}`)
  clipboard.default.writeSync(output)
}

/* c8 ignore next */
if (process.argv.includes('--clipboard')) processClipboard()
