/* eslint-disable no-console */
import { readdirSync, writeFileSync } from 'fs'
import path from 'path'
import { blue, ellipsis, green, red, slugify, yellow } from 'shuutils'
import { fileURLToPath } from 'url'

// Use me like : ts-node-esm --transpileOnly one-file/check-screens.cli.ts "U:\Screens"

// eslint-disable-next-line @typescript-eslint/unbound-method
const { argv, cwd } = process
const expectedNbParameters = 2
if (argv.length <= expectedNbParameters) console.log('Targeting current folder, you can also specify a specific path, ex : ts-node-esm --transpileOnly one-file/check-screens.cli.ts "U:\\Screens\\" \n')
const screensPath = path.normalize(argv[expectedNbParameters] ?? cwd())
const isImage = /\.(?:jpg|png)$/u
const colors = [red, green, blue, yellow] as const
let colorIndex = 0
const thisFilePath = fileURLToPath(import.meta.url)
const currentFolder = path.dirname(thisFilePath)
const nbSpaces = 2

function color (text: string) {
  colorIndex = (colorIndex + 1) % colors.length
  return colors[colorIndex]?.(text) ?? text
}

function getGroupFromName (name: string) {
  const slugs = slugify(name.replace(/[_.]/gu, ' ')).split('-')
  const minLength = 8 // increase this to be more precise
  const maxSlugs = 2
  if (slugs.slice(0, maxSlugs).join('-').length > minLength) return slugs.slice(0, maxSlugs).join('-')
  return slugs.slice(0, maxSlugs + 1).join('-')
}

class CheckScreens {

  public start () {
    console.log('\nCheck Videos is starting !\n')
    const files = this.getFiles()
    const groups = this.getGroups(files)
    const singles = this.getSingles(groups)
    this.report(groups, singles)
  }

  private getFiles () {
    console.log(`Scanning dir ${screensPath}...`)
    const files = readdirSync(screensPath).filter(name => isImage.test(name))
    console.log(`Found ${files.length} files`)
    console.log('First file is :', ellipsis(files[0]))
    return files
  }

  private getGroups (files: string[]) {
    const groups: Record<string, string[]> = {}
    for (const file of files) {
      const group = getGroupFromName(file)
      if (!groups[group]) groups[group] = []
      groups[group]?.push(file)
    }
    return groups
  }

  private getSingles (groups: Record<string, string[]>) {
    let singles = 0
    for (const [group, names] of Object.entries(groups))
      if (names.length === 1) {
        console.log(`\nGroup ${group} has only one file name : ${color(names[0] ?? 'undefined')}`)
        singles += 1
      }
    return singles
  }

  private report (groups: Record<string, string[]>, singles: number) {
    if (singles === 0) console.log(`\n${color('No')} screenshot seems to be alone, ${color('well done ^^')}`)
    else console.log(`\nFound ${color(singles.toString())} screenshot(s) that seems to be alone`)
    writeFileSync(path.join(currentFolder, 'check-screens.json'), JSON.stringify(groups, undefined, nbSpaces))
  }
}

const instance = new CheckScreens()
instance.start()
