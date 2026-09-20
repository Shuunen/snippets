/* v8 ignore start */
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { logger } from '../core/logger'
import type { BySide, Config, FileDetails, NoiseFilters, SyncFile } from '../core/types'
import { computeBlocks, conflictsOf } from '../merge/blocks'
import { filename, useUnixCarriageReturn, writeAtomic } from './paths'

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
async function getDetails(filepath: string, options: LoadOptions): Promise<FileDetails> {
  const isExisting = existsSync(filepath)
  const rawContent = isExisting ? readFileSync(filepath, 'utf8') : ''
  const content = rawContent.includes('\r') && !keepsCarriageReturn(filepath) ? useUnixCarriageReturn(rawContent) : rawContent
  if (options.canFixCarriageReturn && content !== rawContent)
    try {
      await writeAtomic(filepath, content)
    } catch (error: unknown) {
      logger.error(error)
    }
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
export function loadFiles(configs: Config[], options: LoadOptions): Promise<SyncFile[]> {
  return Promise.all(
    configs.map(async config => {
      const filters = filtersOf(config)
      const [local, repo] = await Promise.all([getDetails(config.local, options), getDetails(backupPathOf(config), options)])
      const fileSides: BySide<FileDetails> = { local, repo }
      const contents: BySide<string> = { local: local.content, repo: repo.content }
      return { areEquals: conflictsOf(computeBlocks(contents, filters)).length === 0, filters, sides: fileSides }
    }),
  )
}
