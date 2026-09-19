/* v8 ignore start */
import { gray, green, red, yellow } from 'shuutils'
import { backupPath, files } from './files.node'
import { resolveFile } from './merge.node'
import type { File, Report } from './types'
import { copy, filename, logger, normalizePathWithSlash } from './utils.node'

const isDryRun = process.argv.includes('--dry')
const isSetup = process.argv.includes('--setup')
const isDebug = process.argv.includes('--debug')
const isReport = process.argv.includes('--report')
const relativeBackupPath = normalizePathWithSlash(backupPath)
  .replace(normalizePathWithSlash(process.env.PWD ?? '').replace('/c/', 'C:/'), '')
  .slice(1)

const report: Report = { errors: [], infos: [], success: [], suggestions: [], warnings: [] }

/**
 * Synchronize a file
 * @param file the file to synchronize
 * @returns the number of things you have to do in Life
 */
async function sync(file: File): Promise<number> {
  process.stdout.write('.')
  const { areEquals, destination, source } = file
  if (!source.isExisting) {
    if (!isSetup) return report.infos.push(`source file does not exists : ${source.filepath}`)
    if (isDryRun) return report.infos.push(`would copy ${filename(destination.filepath)} to ${source.filepath}`)
    const isSuccess = await copy(destination.filepath, source.filepath)
    if (isSuccess) return report.success.push(`file setup : ${source.filepath}`)
    return report.errors.push(`failed at copying : ${destination.filepath}`)
  }
  if (!destination.isExisting) {
    if (isDryRun) return report.infos.push(`would copy ${source.filepath} to ${destination.filepath}`)
    const isSuccess = await copy(source.filepath, destination.filepath)
    if (isSuccess) return report.success.push(`sync done : ${source.filepath}`)
    return report.errors.push(`failed at copying : ${source.filepath}`)
  }
  if (areEquals) return report.success.push(`sync is up to date : ${source.filepath}`)
  report.infos.push(`file should be sync manually : ${source.filepath}`)
  if (isReport || isDryRun) return report.suggestions.push(`merge ${relativeBackupPath}/${filename(destination.filepath)} ${normalizePathWithSlash(source.filepath, true)}`)
  return report.suggestions.push(source.filepath)
}

/**
 * Interactively merge every out-of-sync file, one at a time, using the terminal merge UI
 * @param outOfSyncPaths the source filepaths that still need merging
 */
async function mergeOutOfSyncFiles(outOfSyncPaths: string[]) {
  const outOfSyncFiles = files.filter(file => outOfSyncPaths.includes(file.source.filepath))
  for (const [index, file] of outOfSyncFiles.entries()) {
    // eslint-disable-next-line no-await-in-loop
    const outcome = await resolveFile(file, index + 1, outOfSyncFiles.length)
    if (outcome === 'resolved') report.success.push(`sync done : ${file.source.filepath}`)
    else if (outcome === 'skipped') report.warnings.push(`merge skipped, still out of sync : ${file.source.filepath}`)
    else {
      report.warnings.push(`merge aborted by user, ${outOfSyncFiles.length - index} file(s) left untouched`)
      break
    }
  }
}

/**
 * Start the sync process
 */
async function start() {
  process.stdout.write('\nSyncing')
  await Promise.all(files.map(file => sync(file)))
  const outOfSyncPaths = report.suggestions
  report.suggestions = []
  if (!isReport && !isDryRun && outOfSyncPaths.length > 0) await mergeOutOfSyncFiles(outOfSyncPaths)
  for (const error of report.errors) logger.error(red(error))
  for (const warning of report.warnings) logger.warn(yellow(warning))
  if (isDebug) for (const info of report.infos) logger.info(info)
  if (isDebug) for (const success of report.success) logger.info(green(success))
  if (outOfSyncPaths.length > 0 && (isReport || isDryRun))
    logger.info(
      '\n TODO :\n=====\n1. review changes on this repo if any\n2. run these to compare backup & local files :\n\n',
      outOfSyncPaths.join('\n '),
      '\n',
      gray('tip : you can check the configs/changes folder to see the cleaned changes'),
    )
  else if (!isReport && !isDryRun && outOfSyncPaths.length > 0) logger.info(green('\n\nMerge session done, review the changes in this repo, then commit & push manually :)\n'))
  else logger.info(green('\n\nSync done, no actions required :)'))
}

await start().catch(error => {
  logger.error(error)
})
