import { readSync, writeSync } from 'clipboardy'

const input = readSync()

const output = input.replace(/\s*\n+/g, '\n\n').trim()

console.log('will copy this to clipboard :\n---\n' + output + `\n--- ${Date.now()}`)

writeSync(output)
