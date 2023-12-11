/* c8 ignore start */
/* eslint-disable no-console */
import { copyFileSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync } from 'fs'
import path from 'path'

// Go into the Downloads\Azerty.S01.1080p.WEBRip.x265-RARBG folder
// then use me like : ts-node-esm --transpileOnly ~/Projects/github/snippets/one-file/rename-subs.cli.ts

const isDebug = process.argv.includes('--debug')
const currentFolder = process.cwd()
const kb = 1024
const nbDecimals = 2
const subsFolder = path.join(currentFolder, 'Subs')
const subsStat = statSync(subsFolder)
if (!subsStat.isDirectory()) throw new Error(`Could not find subs folder ${subsFolder}`)

function isFullCaption (filepath: string) {
  const content = readFileSync(filepath, 'utf8')
  const nbBlocks = content.match(/\[[a-z\s]+\]/giu)?.length ?? 0
  const minBlocks = 10
  if (isDebug) console.log(`File ${path.basename(filepath)} has ${nbBlocks} blocks`)
  return nbBlocks > minBlocks
}

/**
 * Bring a sub to the top of the folder
 * @param fromPath the actual path of the sub like "D:\Downloads\Azerty.S01.1080p.WEBRip.x265-RARBG\Subs\Azerty.S01E01.1080p.WEBRip.x265-RARBG\4_French.srt"
 * @param language the language of the sub like "fr"
 * @returns {void}
 */
// eslint-disable-next-line max-statements
function bringSubTop (fromPath: string, language: string) {
  const episodeLocation = -2
  const toFilename = `${fromPath.split('\\').at(episodeLocation) ?? ''}.${language}.srt`
  const toPath = path.join(currentFolder, toFilename)
  const toStat = statSync(toPath, { throwIfNoEntry: false }) // eslint-disable-line @typescript-eslint/naming-convention
  if (toStat?.isFile() ?? false) {
    if (isDebug) console.log(`File ${toPath} already exists`)
    return
  }
  if (isFullCaption(fromPath)) {
    if (isDebug) console.log(`File ${fromPath} seems to be a full caption`)
    if (isDebug) console.log(`Copy ${fromPath} to ${toPath}.fc`)
    copyFileSync(fromPath, `${toPath}.fc`)
    return
  }
  copyFileSync(fromPath, toPath)
}

const subfolders = readdirSync(subsFolder)
subfolders.forEach(subfolder => {
  const folderPath = path.join(subsFolder, subfolder)
  const folderStat = statSync(folderPath)
  if (!folderStat.isDirectory()) throw new Error(`Could not find folder ${folderPath}`)
  const folderFiles = readdirSync(folderPath)
  folderFiles.forEach(file => {
    const filePath = path.join(folderPath, file)
    if (file.toLowerCase().includes('french')) bringSubTop(filePath, 'fr')
    if (file.toLowerCase().includes('english')) bringSubTop(filePath, 'en')
  })
})

// eslint-disable-next-line max-statements, complexity, sonarjs/cognitive-complexity
function checkSubtitle (filename: string, language: string) {
  const subPath = path.join(currentFolder, `${filename}.${language}.srt`)
  const subStat = statSync(subPath, { throwIfNoEntry: false }) // eslint-disable-line @typescript-eslint/naming-convention
  const subFcPath = `${subPath}.fc`
  const subFcStat = statSync(subFcPath, { throwIfNoEntry: false }) // eslint-disable-line @typescript-eslint/naming-convention
  const hasSub = subStat?.isFile() ?? false
  const hasSubFc = subFcStat?.isFile() ?? false
  if (hasSub && hasSubFc) { unlinkSync(subFcPath); return }
  if (!hasSub && hasSubFc) { renameSync(subFcPath, subPath); return }
  if (!hasSub && !hasSubFc) { console.error(`Could not find ${subPath}`); return }
  const sizeInKb = (subStat?.size ?? 0) / kb
  const minSizeInKb = 4
  if (sizeInKb < minSizeInKb) { console.error(`File ${path.basename(subPath)} seems weirdly small (${sizeInKb.toFixed(nbDecimals)}Kb)`); return }
  if (isDebug) console.log(`File ${subPath} seems ok`)
}

const videoFile = /(?:\.mkv|\.mp4|\.avi|\.webm|\.mov|\.wmv|\.flv)$/iu
const files = readdirSync(currentFolder)
files.forEach(file => {
  if (!videoFile.test(file)) return
  const extensionLocation = -1
  const filenameWithoutExtension = file.split('.').slice(0, extensionLocation).join('.')
  checkSubtitle(filenameWithoutExtension, 'fr')
  checkSubtitle(filenameWithoutExtension, 'en')
})

console.log('Copy and/or check done, every episode has fr/en subtitles !')
