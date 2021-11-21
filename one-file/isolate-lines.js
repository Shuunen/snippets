#!/usr/bin/env node
const mergeUnique = (array) => [...new Set(array)]

const isolateList = (list) => {
  const lines = mergeUnique(list.replace(/ /g, '').split('\n')).filter(line => line.length > 0)
  return lines.sort().join('\n\n').trim()
}

const processClipboard = async () => {
  const clipboard = await import('clipboardy')
  const input = clipboard.default.readSync()
  const output = isolateList(input)
  console.log('will copy this to clipboard :\n---\n' + output + `\n--- ${Date.now()}`)
  clipboard.default.writeSync(output)
}

const runTests = async () => {
  const { strictEqual } = await import('assert')
  console.log('Running tests...')
  strictEqual(isolateList('xyz\nudp://9.7zip.t0:2750  xyz  \n \n \n http://ubuntu.com:80/announce  \n  ab-cd\n\n  ab-cd '), 'ab-cd\n\nhttp://ubuntu.com:80/announce\n\nudp://9.7zip.t0:2750xyz\n\nxyz')
  console.log('Every tests passed')
}

process.argv.includes('--clipboard') ? processClipboard() : runTests()
