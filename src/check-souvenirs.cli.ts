// oxlint-disable promise/no-nesting, promise/prefer-await-to-then, max-lines
import { spawnSync } from 'node:child_process'
import { rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { Presets, SingleBar } from 'cli-progress'
import { ExifDateTime, ExifTool, type Maybe } from 'exiftool-vendored'
import sharp from 'sharp'
import { blue, functionReturningVoid, green, Logger, nbThird, Result, red, yellow } from 'shuutils'
import glob from 'tiny-glob'

// use me like :
//  cd /d/Souvenirs && bun ~/Projects/github/snippets/src/check-souvenirs.cli.ts
//  bun ~/Projects/github/snippets/src/check-souvenirs.cli.ts "/d/Souvenirs"
//  bun ~/Projects/github/snippets/src/check-souvenirs.cli.ts "/d/Souvenirs" --process-one

await using exif = new ExifTool()
const { argv } = process
const expectedNbParameters = 2
export const currentFolder = process.cwd()
export const logger = new Logger({ willOutputToMemory: true })
/* v8 ignore next */
if (argv.length <= expectedNbParameters) logger.info('Targeting current folder, you can also specify a specific path, ex : check-souvenirs.cli.ts "D:\\Souvenirs\\" \n')
const photosPath = path.normalize(argv[expectedNbParameters] ?? currentFolder)

const progressBar = new SingleBar(
  {
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    format: 'Progress |{bar}| {percentage}% | {value}/{total} files',
    hideCursor: true,
  },
  Presets.shades_classic,
)

export const options = {
  /** When dry active, avoid file modifications, useful for testing purposes */
  dry: argv.includes('--dry'),
  /** Glob pattern to check files */
  globPattern: '**/*.{3gp,3GP,avi,AVI,avif,AVIF,flv,FLV,jpg,JPG,jpeg,JPEG,gif,GIF,mov,MOV,png,PNG,MP,mkv,MKV,mp4,MP4,webp,WEBP,wmv,WMV,webm,WEBM}',
  /** When true, process only the first file, useful for testing purposes */
  one: argv.includes('--process-one') || argv.includes('--one'),
}

const regex = {
  year: /\\(?<year>\d{4})/,
  yearAndMonth: /\\(?<year>\d{4})-(?<month>\d{2})/,
}

type File = {
  previousFilePath: string
  currentFilePath: string
  nextFilePath: string
}

export const count = {
  conversions: 0,
  dateFixes: 0,
  errors: 0,
  scanned: 0,
  skipped: 0,
  specialCharsFixes: 0,
  warnings: 0,
}

export function dateFromPath(filePath: string) {
  const yearAndMonth = regex.yearAndMonth.exec(filePath)?.groups
  if (yearAndMonth) return Result.ok({ month: yearAndMonth.month === '00' ? undefined : yearAndMonth.month, year: yearAndMonth.year })
  const year = regex.year.exec(filePath)?.groups
  if (year) return Result.ok({ month: undefined, year: year.year })
  return Result.ok({ month: undefined, year: undefined })
}

/**
 * Get files
 * @returns {string[]} list of files
 */
export async function getFiles() {
  logger.info(`Scanning dir ${blue(photosPath)}...`)
  const files = await glob(options.globPattern, { absolute: true, cwd: photosPath, filesOnly: true })
  logger.info(`Found ${blue(files.length.toString())} files with glob pattern ${blue(options.globPattern)}`)
  return files
}

export function toDate(data: string | ExifDateTime) {
  if (data instanceof ExifDateTime) return data.toDate()
  return new Date(data)
}

export function formatTimezoneOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absMinutes = Math.abs(offsetMinutes)
  const minutesInHour = 60
  const hours = Math.floor(absMinutes / minutesInHour)
    .toString()
    .padStart(nbThird, '0')
  const minutes = (absMinutes % minutesInHour).toString().padStart(nbThird, '0')
  return `${sign}${hours}:${minutes}`
}

export function setFileDateViaExifTool(file: string, date: ExifDateTime) {
  return exif
    .write(file, { DateTimeOriginal: date }) // first attempt
    .then(() => {
      logger.debug(`Successfully set DateTimeOriginal for file ${green(file)} on first attempt`)
      count.dateFixes += 1
      return undefined
    })
    .catch(async () => {
      logger.debug(`Failed to write DateTimeOriginal for file ${red(file)}, retrying...`)
      // sometimes exif tool fails to write the date, so we rewrite all tags as a workaround
      await exif.rewriteAllTags(file, `${file}.new`) // cant rewrite in place so write to new file
      await unlink(file) // remove original
      await rename(`${file}.new`, file) // rename new to original name
      logger.debug(`Rewrote all tags for file ${green(file)}, retrying to set DateTimeOriginal...`)
      await exif
        .write(file, { DateTimeOriginal: date }) // second attempt
        .then(() => {
          logger.debug(`Successfully set DateTimeOriginal for file ${green(file)} on second attempt`)
          count.dateFixes += 1
          return undefined
        })
        .catch((error: unknown) => {
          logger.error(`Failed again to write DateTimeOriginal for file ${red(file)} : ${String(error)}`)
        })
      logger.debug(`Successfully set DateTimeOriginal for file ${green(file)} on second attempt`)
    })
    .finally(() => {
      // created by exif tool
      void unlink(`${file}_original`).catch(functionReturningVoid)
    })
}

let isMkvPropEditAvailable: boolean | undefined = undefined

export function resetMkvToolCache() {
  isMkvPropEditAvailable = undefined
}

export function isMkvToolAvailable() {
  if (isMkvPropEditAvailable !== undefined) return isMkvPropEditAvailable
  try {
    const result = spawnSync('mkvpropedit.exe', ['--version'], { encoding: 'utf8' })
    if (result.error) throw result.error
    logger.success(`mkvpropedit tool is available in version`, result.stdout.trim())
    isMkvPropEditAvailable = true
  } catch (error) {
    logger.warn('Version test failed.', error instanceof Error ? error.message : error)
    isMkvPropEditAvailable = false
  }
  return isMkvPropEditAvailable
}

export function setFileDateViaMkvTool(file: string, date: string) {
  logger.info(`Setting date for video file ${file} to ${green(date)}`)
  if (!isMkvToolAvailable()) {
    logger.warn(`Cannot set date because ${red('mkvpropedit')} tool is not available.`)
    return
  }
  try {
    // Example to set mkv date on windows : mkvpropedit.exe 2016-02-15_Journal.mkv --edit info --set "date=1974-05-22"
    const result = spawnSync('mkvpropedit.exe', [file, '--edit', 'info', '--set', `date=${date}`], {
      encoding: 'utf8',
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
      logger.error(`Failed to set date, mkvpropedit exited with ${red(`stderr: ${result.stderr.trim()}`)} ${yellow(`stdout: ${result.stdout.trim()}`)}`)
      return
    }
    logger.debug(`Successfully set date for file ${green(file)}.`)
    count.dateFixes += 1
  } catch (error) {
    logger.error(`Failed to set date for file ${red(file)} using mkvpropedit.`, error)
  }
}

export function isPhoto(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  const photoExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.avif', '.webp']
  return photoExtensions.includes(extension)
}

export function isMatroskaVideo(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  const nonMatroskaExtensions = ['.wmv', '.mp4', '.avi', '.mov', '.flv', '.3gp', '.webm']
  return !nonMatroskaExtensions.includes(extension)
}

export function isFileSupportedForDateSetting(filePath: string) {
  return isPhoto(filePath) || isMatroskaVideo(filePath)
}

export function setFileDate(file: string, date?: ExifDateTime) {
  const isoString = date?.toString()?.split('T')[0]
  if (isoString === undefined) {
    logger.error(`Invalid date provided for file ${red(file)}`, date)
    return Promise.resolve()
  }
  logger.info(`Setting DateTimeOriginal for file ${file} to ${green(isoString)}`)
  /* v8 ignore next */
  if (options.dry) {
    logger.info(blue('Dry run enabled, avoid setting date'))
    return Promise.resolve()
  }
  // oxlint-disable-next-line typescript/no-non-null-assertion
  if (isPhoto(file)) return setFileDateViaExifTool(file, date!)
  if (isMatroskaVideo(file)) return setFileDateViaMkvTool(file, isoString)
  logger.warn(`Cannot set date for unsupported file type: ${yellow(file)}`)
  return Promise.resolve()
}

// oxlint-disable-next-line complexity
export function getNewExifDateBasedOnExistingDate({
  pathYear,
  pathMonth,
  originalExifDate,
  exifYearIncorrect,
  exifMonthIncorrect,
  exifDate,
}: {
  pathYear?: string
  pathMonth?: string
  originalExifDate: Maybe<ExifDateTime>
  exifYearIncorrect: boolean
  exifMonthIncorrect: boolean
  exifDate: Date
}) {
  const newYear = exifYearIncorrect && pathYear ? Math.trunc(Number(pathYear)) : (originalExifDate?.year ?? exifDate.getFullYear())
  const newMonth = exifMonthIncorrect && pathMonth ? Math.trunc(Number(pathMonth)) : (originalExifDate?.month ?? exifDate.getMonth() + 1)
  let day = originalExifDate?.day ?? exifDate.getDate()
  const daysInMonth = new Date(newYear, newMonth, 0).getDate()
  if (day > daysInMonth) day = daysInMonth
  const hour = originalExifDate?.hour ?? exifDate.getHours()
  const minute = originalExifDate?.minute ?? exifDate.getMinutes()
  const second = originalExifDate?.second ?? exifDate.getSeconds()
  const millisecond = originalExifDate?.millisecond ?? exifDate.getMilliseconds()
  const tzOffsetMinutes = originalExifDate?.tzoffsetMinutes ?? -exifDate.getTimezoneOffset()
  const millisecondPadding = 3
  const datePart = `${newYear}-${newMonth.toString().padStart(nbThird, '0')}-${day.toString().padStart(nbThird, '0')}`
  const timePart = `${hour.toString().padStart(nbThird, '0')}:${minute.toString().padStart(nbThird, '0')}:${second.toString().padStart(nbThird, '0')}.${millisecond.toString().padStart(millisecondPadding, '0')}`
  const isoString = `${datePart}T${timePart}${formatTimezoneOffset(tzOffsetMinutes)}`
  return ExifDateTime.fromISO(isoString)
}

export async function checkFileDateTimeOriginal({ file, dateTimeOriginal, pathYear, pathMonth }: { file: string; dateTimeOriginal: string | ExifDateTime; pathYear: string; pathMonth?: string }) {
  const originalExifDate = dateTimeOriginal instanceof ExifDateTime ? dateTimeOriginal : ExifDateTime.fromISO(dateTimeOriginal)
  const exifDate = toDate(dateTimeOriginal)
  const exifYear = exifDate.getFullYear().toString()
  const exifYearIncorrect = exifYear !== pathYear
  const exifMonth = (exifDate.getMonth() + 1).toString().padStart(nbThird, '0')
  const exifMonthIncorrect = pathMonth !== undefined && exifMonth !== pathMonth
  if (exifYearIncorrect) logger.info(`Year mismatch for file ${file} : ${green(pathYear)} (from path), ${red(exifYear)} (from EXIF)`)
  if (exifMonthIncorrect) logger.info(`Month mismatch for file ${file} : ${green(pathMonth)} (from path), ${red(exifMonth)} (from EXIF)`)
  if (exifYearIncorrect || exifMonthIncorrect) {
    const newExifDate = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect,
      exifYearIncorrect,
      originalExifDate,
      pathMonth,
      pathYear,
    })
    await setFileDate(file, newExifDate)
  } else {
    logger.debug(`DateTimeOriginal EXIF tag is correct for file ${blue(file)}`)
    count.skipped += 1
  }
}

export async function getExifDateFromSiblings(file: File): Promise<ExifDateTime | undefined> {
  const siblings = [file.previousFilePath, file.nextFilePath].filter(sibling => sibling !== '')
  const referenceDate: ExifDateTime | undefined = await (async () => {
    for (const sibling of siblings) {
      // oxlint-disable-next-line no-await-in-loop
      const tags = await exif.read(sibling)
      if (tags.DateTimeOriginal === undefined) continue
      /* v8 ignore next */
      logger.debug(`Found DateTimeOriginal in sibling file ${sibling} : ${green(tags.DateTimeOriginal.toString() ?? 'undefined')}`)
      return tags.DateTimeOriginal instanceof ExifDateTime ? tags.DateTimeOriginal : ExifDateTime.fromISO(tags.DateTimeOriginal)
    }
    return undefined
  })()
  return referenceDate
}

export function getExifDateFromYearAndMonth(pathYear: string, pathMonth?: string) {
  const isoString = `${pathYear}-${pathMonth ?? '01'}-01T00:00:00.000`
  return ExifDateTime.fromISO(isoString)
}

export async function getNewExifDateBasedOnSiblings(file: File, pathYear: string, pathMonth?: string) {
  const referenceDate = (await getExifDateFromSiblings(file)) ?? getExifDateFromYearAndMonth(pathYear, pathMonth)
  /* v8 ignore start */
  const fallbackDate = new Date(`${pathYear}-${pathMonth ?? '01'}-01T00:00:00.000`)
  const exifDate = referenceDate === undefined ? fallbackDate : toDate(referenceDate)
  /* v8 ignore stop */
  const exifYear = exifDate.getFullYear().toString()
  const exifYearIncorrect = exifYear !== pathYear
  const exifMonth = (exifDate.getMonth() + 1).toString().padStart(nbThird, '0')
  const exifMonthIncorrect = pathMonth !== undefined && exifMonth !== pathMonth
  const newExifDate = getNewExifDateBasedOnExistingDate({
    exifDate,
    exifMonthIncorrect,
    exifYearIncorrect,
    originalExifDate: referenceDate,
    pathMonth,
    pathYear,
  })
  return newExifDate
}

export async function setFileDateBasedOnSiblings(file: File, pathYear: string, pathMonth?: string) {
  logger.info(`No DateTimeOriginal EXIF tag for file ${blue(file.currentFilePath)}, checking siblings...`)
  const newExifDate = await getNewExifDateBasedOnSiblings(file, pathYear, pathMonth)
  await setFileDate(file.currentFilePath, newExifDate)
}

export async function checkFileDate(file: File) {
  if (!isFileSupportedForDateSetting(file.currentFilePath)) {
    logger.debug(`File type not supported for date setting : ${blue(file.currentFilePath)}`)
    count.skipped += 1
    return
  }
  const { month: pathMonth, year: pathYear } = dateFromPath(file.currentFilePath).value
  logger.debug(`Extracted date from path : year=${pathYear ?? 'undefined'}, month=${pathMonth ?? 'undefined'}`)
  if (pathYear === undefined) {
    logger.warn(`No year found in path for file ${red(file.currentFilePath)}, skipping date check`)
    return
  }
  const tags = await exif.read(file.currentFilePath)
  logger.debug(`Extracted DateTimeOriginal from exif : DateTimeOriginal=${tags.DateTimeOriginal ?? 'undefined'}`)
  if (tags.DateTimeOriginal === undefined) await setFileDateBasedOnSiblings(file, pathYear, pathMonth)
  else
    await checkFileDateTimeOriginal({
      dateTimeOriginal: tags.DateTimeOriginal,
      file: file.currentFilePath,
      pathMonth,
      pathYear,
    })
}

export async function checkFilePathExtensionCase(filePath: string): Promise<string> {
  const extension = path.extname(filePath)
  const isUpperCaseExtension = extension !== extension.toLowerCase()
  if (!isUpperCaseExtension) return filePath
  const newFilePath = filePath.slice(0, -extension.length) + extension.toLowerCase()
  const tempFilePath = `${filePath}.tmp_renaming`
  logger.info(`Renaming file ${red(filePath)} to ${green(newFilePath)} to have lowercase extension`)
  /* v8 ignore next */
  if (options.dry) {
    logger.info(blue('Dry run enabled, avoid renaming file'))
    return newFilePath
  }
  await rename(filePath, tempFilePath)
  await rename(tempFilePath, newFilePath)
  return newFilePath
}

const forbiddenCharsInFileName = /[^a-zA-Z0-9._\- éèêëàâäôöùûüç]/g
const forbiddenCharsInFilePath = /[^a-zA-Z0-9._\- \\/:éèêëàâäôöùûüç]/g
const trailingDashes = /-+$/

export function cleanFilePath(filePath: string): string {
  const basename = path.basename(filePath)
  const extension = path.extname(basename)
  const nameWithoutExtension = basename.slice(0, basename.length - extension.length)
  const cleanName = nameWithoutExtension.replaceAll(forbiddenCharsInFileName, '-').replaceAll(/-+/g, '-').replace(trailingDashes, '').trim()
  const newFileName = cleanName + extension
  const newFilePath = path.join(path.dirname(filePath), newFileName)
  const directoryPath = path.dirname(filePath)
  if (forbiddenCharsInFilePath.test(directoryPath)) logger.warn(`File path ${filePath} contains forbidden characters`)
  if (newFilePath === filePath) return filePath
  return newFilePath
}

export async function checkFilePathSpecialCharacters(filePath: string): Promise<string> {
  const newFilePath = cleanFilePath(filePath)
  if (newFilePath === filePath) return filePath
  logger.info(`Renaming file ${red(filePath)} to ${green(newFilePath)} to remove special characters`)
  /* v8 ignore next */
  if (options.dry) {
    logger.info(blue('Dry run enabled, avoid renaming file'))
    return newFilePath
  }
  await rename(filePath, newFilePath)
  count.specialCharsFixes += 1
  return newFilePath
}

export async function checkPngTransparency(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  if (extension !== '.png') return filePath // no need to check other file types
  const tags = await exif.read(filePath)
  if (!('ColorType' in tags)) {
    logger.warn(`No ColorType tag found for PNG file ${red(filePath)}. Unable to determine transparency.`)
    return filePath
  }
  if (tags.ColorType !== 'RGB') return filePath // has transparency
  logger.info(`PNG file without transparency detected ${red(filePath)}. Converting to JPG...`)
  /* v8 ignore next */
  if (options.dry) {
    logger.info(blue('Dry run enabled, avoid converting file'))
    return filePath
  }
  const jpgFilePath = `${filePath.slice(0, -extension.length)}.jpg`
  await sharp(filePath).jpeg({ quality: 90 }).toFile(jpgFilePath)
  logger.info(`Converted ${filePath} to ${green(jpgFilePath)}`)
  await unlink(filePath).catch(functionReturningVoid)
  logger.debug(`Deleted original PNG file: ${filePath}`)
  count.conversions += 1
  return jpgFilePath
}

export async function checkFilePathExtensionMp(filePath: string): Promise<string> {
  const extension = path.extname(filePath).toLowerCase()
  if (extension !== '.mp') return filePath
  const newFilePath = `${filePath.slice(0, -extension.length)}.mp4`
  logger.info(`Renaming file ${red(filePath)} to have ${green('.mp4')} extension`)
  /* v8 ignore next */
  if (options.dry) {
    logger.info(blue('Dry run enabled, avoid renaming file'))
    return newFilePath
  }
  await rename(filePath, newFilePath)
  return newFilePath
}

/**
 * Check a file against various criteria
 * @param  file - file collection to check
 * @returns nothing
 */
export async function checkFile(file: File) {
  count.scanned += 1
  /* v8 ignore next */
  if (options.one) logger.debug(`Checking file : ${blue(file.currentFilePath)}`)
  else logger.debug(`Checking file : ${blue(file.currentFilePath)}`)
  file.currentFilePath = await checkFilePathExtensionMp(file.currentFilePath)
  file.currentFilePath = await checkFilePathExtensionCase(file.currentFilePath)
  file.currentFilePath = await checkFilePathSpecialCharacters(file.currentFilePath)
  file.currentFilePath = await checkPngTransparency(file.currentFilePath)
  await checkFileDate(file)
}

/**
 * Check files to remove unwanted characters and rename or delete them
 * @param {string[]} files - list of files to rename
 */
export async function checkFiles(files: string[]) {
  /* v8 ignore next 4 */
  if (options.one && files.length > 0) {
    logger.info('Processing only one file as --process-one or --one is set')
    await checkFile({ currentFilePath: files[0] ?? '', nextFilePath: files[1] ?? '', previousFilePath: '' })
    return
  }
  progressBar.start(files.length, 0)
  // await Promise.all(files.map((file, index) => checkFile({ currentFilePath: file, nextFilePath: files[index + 1] ?? '', previousFilePath: files[index - 1] ?? '' })))
  for (const [index, file] of files.entries()) {
    // oxlint-disable-next-line no-await-in-loop
    await checkFile({
      currentFilePath: file,
      nextFilePath: files[index + 1] ?? '',
      previousFilePath: files[index - 1] ?? '',
    })
    progressBar.update(index + 1)
  }
  progressBar.stop()
}

/**
 * Show the final report of operations
 */
export function showReport() {
  const logs = logger.inMemoryLogs
  for (const log of logs)
    if (log.includes('error')) count.errors += 1
    else if (log.includes('warn')) count.warnings += 1
  logger.info(`Report :`)
  logger.info(`- ${count.scanned > 0 ? blue(count.scanned.toString()) : '0'} files scanned`)
  logger.info(`- ${count.skipped > 0 ? blue(count.skipped.toString()) : '0'} files skipped`)
  logger.info(`- ${count.dateFixes > 0 ? green(count.dateFixes.toString()) : '0'} date fixes applied`)
  logger.info(`- ${count.conversions > 0 ? green(count.conversions.toString()) : '0'} png to jpg conversions`)
  logger.info(`- ${count.specialCharsFixes > 0 ? green(count.specialCharsFixes.toString()) : '0'} special characters fixes applied`)
  logger.info(`- ${count.errors > 0 ? red(count.errors.toString()) : '0'} errors`)
  logger.info(`- ${count.warnings > 0 ? yellow(count.warnings.toString()) : '0'} warnings`)
  if (count.errors + count.warnings === 0) logger.success('Nice no issues found ( ͡° ͜ʖ ͡°)')
  else logger.warn('Some issues were found ಠ_ಠ')
}

/**
 * Start the check
 */
export async function start() {
  logger.info('Check Souvenirs started ✅')
  const files = await getFiles()
  await checkFiles(files)
  showReport()
  logger.success('Check Souvenirs is done')
}

// avoid running this script if it's imported for testing
/* v8 ignore if */
if (process.argv[1]?.includes('check-souvenirs.cli.ts')) await start()
