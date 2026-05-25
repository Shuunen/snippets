/* v8 ignore start */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Logger, nbPercentMax } from 'shuutils'
import { compressCsv } from './vivino-compress-export.utils.js'

// usage : bun ~/Projects/github/snippets/src/vivino-compress-export.cli.ts full_wine_list.csv

const currentFolder = import.meta.dirname
const logFile = path.join(currentFolder, 'vivino-compress-export.log')
const logger = new Logger()

/**
 *
 */
async function logClear() {
  await fs.writeFile(logFile, '')
}

/**
 * Add stuff to the log file
 * @param stuff things to add to the log
 */
async function logAdd(...stuff: Date[] | string[]) {
  await fs.appendFile(logFile, `${stuff.join(' ')}\n`)
}

/**
 *
 */
async function init() {
  logger.info('Vivino Compress, will compress your Vivino full_wine_list.csv export file from 170kB to 17kB in seconds')
  await logClear()
  await logAdd('Vivino compress starts @', new Date().toISOString())
  // oxlint-disable-next-line no-unreadable-array-destructuring
  const [, , fileName = ''] = process.argv
  if (!fileName) throw new Error('missing full_wine_list.csv file path')
  const input = await fs.readFile(fileName, 'utf8')
  const output = compressCsv(input)

  await fs.writeFile(fileName.replace('.csv', '.compressed.csv'), output)
  logger.info('  Done, final file is only', Math.round((output.length / input.length) * nbPercentMax), '% of the original size :)')
  await logAdd('Vivino compress ends @', new Date().toISOString())
}

await init()
