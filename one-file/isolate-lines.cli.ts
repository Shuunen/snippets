import clipboard from 'clipboardy'
import { isolateLines } from './isolate-lines.utils.js' // js extension is required for ts-node to import it

console.log('isolate-lines.cli start')
const input = clipboard.readSync()
const output = isolateLines(input)
console.log(`will copy this to clipboard :\n---\n${output}\n--- ${new Date().toLocaleString()}`)
clipboard.writeSync(output)
