/* v8 ignore start */
import { readFileSync } from 'node:fs'
import { dim, green, red, yellow } from 'shuutils'
import { logger } from './logger'
import { clearLastRender } from './merge/screen'
import { createMergeSession, resolveFile } from './merge/session'
import { detectPlatform, getConfigs } from './sync/catalog'
import { backupPath, loadFiles } from './sync/files'
import { copy, filename, normalizePathWithSlash } from './sync/paths'
import { createReport, summarize } from './sync/report'
import type { Report, SyncFile } from './types'

const flags = {
  isDebug: process.argv.includes('--debug'),
  isDryRun: process.argv.includes('--dry'),
  isReport: process.argv.includes('--report'),
  isSetup: process.argv.includes('--setup'),
}
/** a --report or --dry run only looks : it never writes to either side */
const isPreview = flags.isReport || flags.isDryRun

const relativeBackupPath = normalizePathWithSlash(backupPath)
  .replace(normalizePathWithSlash(process.env.PWD ?? '').replace('/c/', 'C:/'), '')
  .slice(1)

const report = createReport()

/**
 * Bring one file in sync when it can be done without asking : create a missing side, or note that
 * both sides already agree. A file differing on both sides is only suggested for merging
 * @param file the file to synchronize
 */
async function sync(file: SyncFile): Promise<void> {
  const { areEquals, sides } = file
  if (!sides.local.isExisting) {
    if (!flags.isSetup) report.infos.push(`local file does not exists : ${sides.local.filepath}`)
    else if (flags.isDryRun) report.infos.push(`would copy ${filename(sides.repo.filepath)} to ${sides.local.filepath}`)
    else if (await copy(sides.repo.filepath, sides.local.filepath)) report.success.push(`file setup : ${sides.local.filepath}`)
    else report.errors.push(`failed at copying : ${sides.repo.filepath}`)
    return
  }
  if (!sides.repo.isExisting) {
    if (flags.isDryRun) report.infos.push(`would copy ${sides.local.filepath} to ${sides.repo.filepath}`)
    else if (await copy(sides.local.filepath, sides.repo.filepath)) report.success.push(`sync done : ${sides.local.filepath}`)
    else report.errors.push(`failed at copying : ${sides.local.filepath}`)
    return
  }
  if (areEquals) {
    report.success.push(`sync is up to date : ${sides.local.filepath}`)
    return
  }
  report.infos.push(`file should be sync manually : ${sides.local.filepath}`)
  if (isPreview) report.suggestions.push(`merge ${relativeBackupPath}/${filename(sides.repo.filepath)} ${normalizePathWithSlash(sides.local.filepath, true)}`)
  else report.suggestions.push(sides.local.filepath)
}

/**
 * Interactively merge every out-of-sync file, one at a time, using the terminal merge UI
 * @param outOfSyncFiles the files that still need merging
 * @returns true if at least one repo file ended up with different content than before merging
 */
async function mergeOutOfSyncFiles(outOfSyncFiles: SyncFile[]): Promise<boolean> {
  const session = createMergeSession()
  let hasRepoChanges = false
  for (const [index, file] of outOfSyncFiles.entries()) {
    const contentBefore = file.sides.repo.content
    // eslint-disable-next-line no-await-in-loop
    const outcome = await resolveFile({ file, fileIndex: index + 1, fileTotal: outOfSyncFiles.length }, session)
    if (outcome === 'resolved') {
      report.success.push(`sync done : ${file.sides.local.filepath}`)
      if (readFileSync(file.sides.repo.filepath, 'utf8') !== contentBefore) hasRepoChanges = true
    } else if (outcome === 'skipped') report.warnings.push(`merge skipped, still out of sync : ${file.sides.local.filepath}`)
    else {
      report.warnings.push(`merge aborted by user, ${outOfSyncFiles.length - index} file(s) left untouched`)
      break
    }
  }
  return hasRepoChanges
}

/**
 * Print everything the run gathered, quietest first
 * @param gathered the run's report
 */
function printReport(gathered: Report): void {
  for (const error of gathered.errors) logger.error(red(error))
  for (const warning of gathered.warnings) logger.warn(yellow(warning))
  if (!flags.isDebug) return
  for (const info of gathered.infos) logger.info(info)
  for (const success of gathered.success) logger.info(green(success))
}

/**
 * Start the sync process
 */
async function start() {
  const platform = detectPlatform()
  logger.info(`Using home directory ${dim(platform.home)}`)
  logger.info(`Using app data directory ${dim(platform.appData)}`)
  logger.info(`Detected platform ${dim(platform.isWindows ? 'windows' : 'linux')}`)
  const files = loadFiles(getConfigs(platform), { canFixCarriageReturn: !isPreview })
  await Promise.all(files.map(file => sync(file)))
  const outOfSyncPaths = report.suggestions
  report.suggestions = []
  const didMerge = !isPreview && outOfSyncPaths.length > 0
  const outOfSyncFiles = files.filter(file => outOfSyncPaths.includes(file.sides.local.filepath))
  const hasRepoChanges = didMerge && (await mergeOutOfSyncFiles(outOfSyncFiles))
  if (didMerge) clearLastRender()
  printReport(report)
  logger.info(...summarize({ didMerge, hasRepoChanges, isPreview, outOfSyncPaths }))
}

await start().catch(error => {
  logger.error(error)
})
