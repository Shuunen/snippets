import clipboard from 'clipboardy'
import { isolateLines, linesToList } from './isolate-lines.utils.js' // js extension is required here

console.log('isolate-lines.cli start')
const input = clipboard.readSync()
const lines = isolateLines(input)
const output = linesToList(lines)
console.log(`will copy this to clipboard :\n---\n${output}\n--- ${new Date().toLocaleString()}`)
clipboard.writeSync(output)
