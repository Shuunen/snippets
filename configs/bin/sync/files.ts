/* v8 ignore start */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { computeBlocks, conflictsOf } from '../merge/blocks'
import type { BySide, Config, FileDetails, NoiseFilters, SyncFile } from '../types'
import { filename, useUnixCarriageReturn } from './paths'

/** where this repo keeps its backup copies */
export const backupPath = path.join(import.meta.dirname, '..', '..', 'files')

/**
 * Whether a file must keep its windows line endings : qbtheme files don't like unix ones
 * @param filepath the file path
 * @returns true if its carriage returns must be left alone
 */
function keepsCarriageReturn(filepath: string): boolean {
  return filepath.includes('.qbtheme')
}

export type LoadOptions = {
  /** whether a file found with windows line endings may be rewritten with unix ones */ canFixCarriageReturn: boolean
}

/**
 * Read a file from disk, normalizing its line endings in memory and, unless the caller forbids it,
 * on disk too. Reading is the only thing a `--dry` or `--report` run is allowed to do, which is why
 * the rewrite is opt-in rather than an unconditional side effect of looking at a file.
 * @param filepath the file path
 * @param options whether the file may be rewritten
 * @returns the file details
 */
function getDetails(filepath: string, options: LoadOptions): FileDetails {
  const isExisting = existsSync(filepath)
  const rawContent = isExisting ? readFileSync(filepath, 'utf8') : ''
  const content = rawContent.includes('\r') && !keepsCarriageReturn(filepath) ? useUnixCarriageReturn(rawContent) : rawContent
  if (options.canFixCarriageReturn && content !== rawContent) void writeFile(filepath, content)
  return { content, filepath, isExisting, modifiedAt: isExisting ? statSync(filepath).mtime : undefined }
}

/**
 * Where the backup copy of a config lives in this repo
 * @param config the config
 * @returns the backup file path
 */
function backupPathOf(config: Config): string {
  return path.join(backupPath, config.renameTo ?? filename(config.local))
}

/**
 * Keep only the noise filters out of a config, leaving its paths behind
 * @param config the config
 * @returns its noise filters
 */
function filtersOf(config: Config): NoiseFilters {
  const { removeBlocksMatching, removeLinesAfter, removeLinesMatching } = config
  return { removeBlocksMatching, removeLinesAfter, removeLinesMatching }
}

/**
 * Read both sides of every config off disk and work out which ones are already in sync
 * @param configs the configs to load
 * @param options whether files may be rewritten with unix line endings
 * @returns one entry per config
 */
export function loadFiles(configs: Config[], options: LoadOptions): SyncFile[] {
  return configs.map(config => {
    const filters = filtersOf(config)
    const fileSides: BySide<FileDetails> = { local: getDetails(config.local, options), repo: getDetails(backupPathOf(config), options) }
    const contents: BySide<string> = { local: fileSides.local.content, repo: fileSides.repo.content }
    return { areEquals: conflictsOf(computeBlocks(contents, filters)).length === 0, filters, sides: fileSides }
  })
}
