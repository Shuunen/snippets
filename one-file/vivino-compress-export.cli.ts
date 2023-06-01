/* eslint-disable no-console */
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { compressCsv } from './vivino-compress-export.utils.js'

// usage : ts-node-esm --transpileOnly ~/Projects/github/snippets/one-file/vivino-compress-export.cli.ts full_wine_list.csv

const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const logFile = path.join(currentFolder, 'vivino-compress-export.log')


function asciiWelcome (): void {
  console.log(`
  o     o  o         o                .oPYo.
  8     8                             8    8
  8     8 o8 o    o o8 odYo. .oPYo.   8      .oPYo. ooYoYo. .oPYo. oPYo. .oPYo. .oPYo. .oPYo.
  \`b   d'  8 Y.  .P  8 8' \`8 8    8   8      8    8 8' 8  8 8    8 8  \`' 8oooo8 Yb..   Yb..
   \`b d'   8 \`b..d'  8 8   8 8    8   8    8 8    8 8  8  8 8    8 8     8.       'Yb.   'Yb.
    \`8'    8  \`YP'   8 8   8 \`YooP'   \`YooP' \`YooP' 8  8  8 8YooP' 8     \`Yooo' \`YooP' \`YooP'
  :::..::::..::...:::....::..:.....::::.....::.....:..:..:..8 ....:..:::::.....::.....::.....::
  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::8 :::::::::::::::::::::::::::::::::
  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::..:::::::::::::::::::::::::::::::::
  :: Will compress your Vivino full_wine_list.csv export file from 170kB to 17kB in seconds ::
  :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  `)
}

async function logClear () {
  // eslint-disable-next-line total-functions/no-unsafe-readonly-mutable-assignment
  await fs.writeFile(logFile, '')
}

async function logAdd (...stuff: Date[] | string[]) {
  await fs.appendFile(logFile, `${stuff.join(' ')}\n`)
}

async function init () {
  asciiWelcome()
  await logClear()
  await logAdd('Vivino compress starts @', new Date().toISOString())
  // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
  const [, , fileName = ''] = process.argv
  if (!fileName) throw new Error('missing full_wine_list.csv file path')
  const input = await fs.readFile(fileName, 'utf8')
  const output = compressCsv(input)
  // eslint-disable-next-line total-functions/no-unsafe-readonly-mutable-assignment
  await fs.writeFile(fileName.replace('.csv', '.compressed.csv'), output)
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  console.log('  Done, final file is only', Math.round(output.length / input.length * 100), '% of the original size :)')
  await logAdd('Vivino compress ends @', new Date().toISOString())
}

await init()

