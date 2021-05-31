const clipboard = require('clipboardy')

const input = clipboard.readSync()

const output = input.replace(/\s*\n+/g, '\n\n').trim()

console.log('will copy this to clipboard :\n---\n' + output + `\n--- ${Date.now()}`)

clipboard.writeSync(output)
