/* v8 ignore start */
import { copyFileSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { Logger } from 'shuutils'

// Go into the Downloads\Azerty.S01.1080p.WEBRip.x265-RARBG folder
// then use me like : node ~/Projects/github/snippets/src/rename-subs.cli.js

const currentFolder = process.cwd()
const kb = 1024
const nbDecimals = 2
const logger = new Logger()
const subsFolder = path.join(currentFolder, 'Subs')
const subsStat = statSync(subsFolder)
if (!subsStat.isDirectory()) throw new Error(`Could not find subs folder ${subsFolder}`)

/**
 * Check if a subtitle file is a full caption
 * @param {string} filepath the filepath to sub
 * @returns {boolean} true if full caption
 */
function isFullCaption(filepath) {
  const content = readFileSync(filepath, 'utf8')
  const nbBlocks = content.match(/\[[a-z\s]+\]/giu)?.length ?? 0
  const minBlocks = 10
  logger.debug(`File ${path.basename(filepath)} has ${nbBlocks} blocks`)
  return nbBlocks > minBlocks
}

/**
 * Bring a sub to the top of the folder
 * @param {string} fromPath the actual path of the sub like "D:\Downloads\Azerty.S01.1080p.WEBRip.x265-RARBG\Subs\Azerty.S01E01.1080p.WEBRip.x265-RARBG\4_French.srt"
 * @param {string} language the language of the sub like "fr"
 * @returns {void}
 */
function bringSubTop(fromPath, language) {
  const episodeLocation = -2
  const toFilename = `${fromPath.split('\\').at(episodeLocation) ?? ''}.${language}.srt`
  const toPath = path.join(currentFolder, toFilename)
  const toStat = statSync(toPath, { throwIfNoEntry: false })
  if (toStat?.isFile() ?? false) {
    logger.debug(`File ${toPath} already exists`)
    return
  }
  if (isFullCaption(fromPath)) {
    logger.debug(`File ${fromPath} seems to be a full caption`)
    logger.debug(`Copy ${fromPath} to ${toPath}.fc`)
    copyFileSync(fromPath, `${toPath}.fc`)
    return
  }
  copyFileSync(fromPath, toPath)
}

const subfolders = readdirSync(subsFolder)
for (const subfolder of subfolders) {
  const folderPath = path.join(subsFolder, subfolder)
  const folderStat = statSync(folderPath)
  if (!folderStat.isDirectory()) throw new Error(`Could not find folder ${folderPath}`)
  const folderFiles = readdirSync(folderPath)
  for (const file of folderFiles) {
    const filePath = path.join(folderPath, file)
    if (file.toLowerCase().includes('french')) bringSubTop(filePath, 'fr')
    if (file.toLowerCase().includes('english')) bringSubTop(filePath, 'en')
  }
}

/**
 * Check subtitle
 * @param {string} filename the filename
 * @param {string} language the lang to check
 * @returns {void}
 */
// oxlint-disable-next-line max-statements
function checkSubtitle(filename, language) {
  const subPath = path.join(currentFolder, `${filename}.${language}.srt`)
  const subStat = statSync(subPath, { throwIfNoEntry: false })
  const subFcPath = `${subPath}.fc`
  const subFcStat = statSync(subFcPath, { throwIfNoEntry: false })
  const hasSub = subStat?.isFile() ?? false
  const hasSubFc = subFcStat?.isFile() ?? false
  if (hasSub && hasSubFc) {
    unlinkSync(subFcPath)
    return
  }
  if (!hasSub && hasSubFc) {
    renameSync(subFcPath, subPath)
    return
  }
  if (!(hasSub || hasSubFc)) {
    logger.error(`Could not find ${subPath}`)
    return
  }
  const sizeInKb = (subStat?.size ?? 0) / kb
  const minSizeInKb = 4
  if (sizeInKb < minSizeInKb) {
    logger.error(`File ${path.basename(subPath)} seems weirdly small (${sizeInKb.toFixed(nbDecimals)}Kb)`)
    return
  }
  logger.debug(`File ${subPath} seems ok`)
}

const videoFile = /(?:\.mkv|\.mp4|\.avi|\.webm|\.mov|\.wmv|\.flv)$/iu
const files = readdirSync(currentFolder)
for (const file of files) {
  if (!videoFile.test(file)) continue
  const extensionLocation = -1
  const filenameWithoutExtension = file.split('.').slice(0, extensionLocation).join('.')
  checkSubtitle(filenameWithoutExtension, 'fr')
  checkSubtitle(filenameWithoutExtension, 'en')
}

logger.info('Copy and/or check done, every episode has fr/en subtitles !')
