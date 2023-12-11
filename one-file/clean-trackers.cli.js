/* c8 ignore start */
import clipboard from 'clipboardy'
import { cleanTrackers } from './clean-trackers.utils.js'

console.log('clean-trackers.cli start')
const input = clipboard.readSync()
const output = cleanTrackers(input)
console.log(`will copy this to clipboard :\n---\n${output}\n--- ${new Date().toLocaleString()}`)
clipboard.writeSync(output)
