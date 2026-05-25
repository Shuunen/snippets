import { readdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { blue, green, Logger, red, yellow } from 'shuutils'

// cd into the folder and use me like : bun ~/Projects/github/snippets/src/clean-ytdl.cli.ts

export const logger = new Logger({ willOutputToMemory: true })
export const currentFolder = process.cwd()
export const options = { dry: false } // set dry to false to actually rename files
export const count = {
  deleted: 0,
  renamed: 0,
  skipped: 0,
}

/**
 * Reset count for testing
 */
export function resetCount() {
  count.deleted = 0
  count.renamed = 0
  count.skipped = 0
}

/**
 * Delete a file to avoid duplicates
 * @param {string} filePath - file path to delete
 * @param {string} reason - reason for deletion
 * @returns {void}
 */
export function deleteFile(filePath: string, reason: string) {
  if (!options.dry) unlinkSync(filePath) // delete the file if it already exists
  const file = path.basename(filePath)
  logger.info(`${red(options.dry ? 'Should delete' : 'Deleted')} file : ${blue(file)}, reason : ${red(reason)}`)
  count.deleted += 1
}

/**
 * Rename a file to remove unwanted characters
 * @param {string} oldFilePath - old file path
 * @param {string} newFilePath - new file path
 * @returns {void}
 * @example renameFile('video (2160p_25fps_AV1-128kbit_AAC-French).mp4', 'video.mp4')
 */
export function renameFile(oldFilePath: string, newFilePath: string) {
  if (!options.dry) renameSync(oldFilePath, newFilePath)
  logger.info(`${options.dry ? 'Should rename' : 'Renamed'} file : ${yellow(path.basename(oldFilePath))} to ${green(path.basename(newFilePath))}`)
  count.renamed += 1
}

/**
 * Clean a file name
 * @param {string} file - file name to clean
 * @returns {string} cleaned file name
 * @example cleanFileName('video (2160p_25fps_AV1-128kbit_AAC-French).mp4') // returns 'video.mp4'
 * @example cleanFileName('video (English_ASR).srt') // returns 'video.en.srt'
 */
export function cleanFileName(file: string): string {
  return (
    file
      // remove (2160p_25fps_AV1-128kbit_AAC-French)
      .replaceAll(/\s*\(\d{3,4}p_\d{1,2}fps_[A-Z0-9-]+-?[\w-]*\)/g, '')
      // replace " (English_ASR)" with "en"
      .replaceAll(/\s*\(English_ASR\)/g, '.en')
      // replace " (English)" with "en"
      .replaceAll(/\s*\(English\)/g, '.en')
      // replace ".English." with ".en."
      .replaceAll('.English.', '.en.')
      // remove fake extensions
      .replace('.exe', '')
      // preserve apostrophes
      .replaceAll(/[’']/g, '@APOSTROPHE@')
      // normalize separators
      .replaceAll(/[¦,:;]/g, ' - ')
      // remove parenthesis, brackets, exclamation marks, and other special characters
      .replaceAll(/[()[\]_'¿]/g, ' ')
      // remove emojis
      .replaceAll(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      // rollback apostrophes
      .replaceAll('@APOSTROPHE@', '’')
      // remove extra spaces
      .replaceAll(/\s+/g, ' ')
      // remove spaces before extension(s), like " .en.srt" => ".en.srt" or " .mp4" => ".mp4"
      .replace(/\s+(\.(?:\w{2,4}\.)*\w{2,4})$/, '$1')
      // trim spaces
      .trim()
  )
}

/**
 * Check if a file exists
 * @param {string} filePath - file path to check
 * @returns {boolean} true if the file exists, false otherwise
 */
export function fileExists(filePath: string): boolean {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false
  }
}

/**
 * Check if a file should be deleted
 * @param {string} file - file name to check
 * @returns {boolean} true if the file should be deleted, false otherwise
 */
export function shouldDelete(file: string): boolean {
  // I don't need french subtitles ^^'
  if (file.endsWith('.French.srt')) return true
  if (file.endsWith('(French_ASR).srt')) return true
  if (file.endsWith('(French).srt')) return true
  return false
}

/**
 * Check a file to remove unwanted characters and rename or delete it
 * @param {string} file - file name to check
 * @returns {void}
 * @example checkFile('video (2160p_25fps_AV1-128kbit_AAC-French).mp4')
 */
export function checkFile(file: string) {
  const oldFilePath = `${currentFolder}/${file}`
  if (shouldDelete(file)) {
    deleteFile(oldFilePath, 'unwanted file')
    return
  }
  const newFile = cleanFileName(file)
  if (newFile === file) {
    count.skipped += 1
    return // no need to rename if the name is the same
  }
  const newFilePath = `${currentFolder}/${newFile}`
  if (fileExists(newFilePath)) deleteFile(oldFilePath, 'duplicate file')
  else renameFile(oldFilePath, newFilePath) // rename the file
}

/**
 * Check files to remove unwanted characters and rename or delete them
 * @param {string[]} files - list of files to rename
 */
export function checkFiles(files: string[]) {
  for (const file of files) checkFile(file)
}

/**
 * Get files
 * @returns {string[]} list of files
 */
export function getFiles() {
  logger.info(`Scanning dir ${currentFolder}...`)
  const files = readdirSync(currentFolder)
  logger.info(`Found ${blue(files.length.toString())} files`)
  return files
}

/**
 * Show the final report of operations
 */
export function showReport() {
  logger.info(`${red(count.deleted.toString())} files ${options.dry ? 'should be ' : ''}deleted`)
  logger.info(`${yellow(count.renamed.toString())} files ${options.dry ? 'should be ' : ''}renamed`)
  logger.info(`${green(count.skipped.toString())} files skipped (no changes needed)`)
}

/**
 * Start the check
 */
export function start() {
  logger.info('Clean YouTube downloaded files')
  const files = getFiles()
  checkFiles(files)
  logger.info(`Found ${files.length} files to check`)
  showReport()
  const nbWarnings = logger.inMemoryLogs.filter(log => log.includes('warn')).length
  if (nbWarnings === 0) logger.success('No warning found ( ͡° ͜ʖ ͡°)')
  else logger.warn(`${nbWarnings} warnings found ಠ_ಠ`)
  logger.success('Clean is done')
}

// avoid running this script if it's imported for testing
/* v8 ignore if */
if (process.argv[1]?.includes('clean-ytdl.cli.ts')) start()
