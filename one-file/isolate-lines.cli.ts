import clipboard from 'clipboardy'
import { isolateLines } from './isolate-lines.utils.js' // js extension is required for ts-node to import it

async function cli (): Promise<void> {
  console.log('isolate-lines.cli start')
  const input = clipboard.readSync()
  const output = isolateLines(input)
  console.log('will copy this to clipboard :\n---\n' + output + `\n--- ${new Date().toLocaleString()}`)
  clipboard.writeSync(output)
}

// eslint-disable-next-line unicorn/prefer-top-level-await
cli().then(() => console.log('isolate-lines ended successfully')).catch(error => {
  console.error(error)
  process.exit(1)
})
