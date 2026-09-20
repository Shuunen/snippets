import { green } from 'shuutils'
import type { Report } from '../core/types'

/**
 * Start an empty report, one bucket per kind of thing worth telling the user afterwards
 * @returns the empty report
 */
export function createReport(): Report {
  return { errors: [], infos: [], success: [], suggestions: [], warnings: [] }
}

export type RunSummary = {
  /** true if the interactive merge UI actually ran */ didMerge: boolean
  /** true if merging left at least one backup file in this repo different than before */ hasRepoChanges: boolean
  /** the files found out of sync */ outOfSyncPaths: string[]
  /** true for a --report or --dry run, which only looks and suggests */ isPreview: boolean
}

/**
 * Build the closing message for a run : what happened, and what the user still has to do about it
 * @param summary what the run ended up doing
 * @returns the lines to print, in order
 */
export function summarize(summary: RunSummary): string[] {
  const { didMerge, hasRepoChanges, isPreview, outOfSyncPaths } = summary
  if (isPreview && outOfSyncPaths.length > 0) return ['TODO :\n=====\n1. review changes on this repo if any\n2. run these to compare backup & local files :\n', outOfSyncPaths.join('\n ')]
  if (didMerge && hasRepoChanges) return [green('Merge session done, review the changes in this repo, then commit & push manually :)\n')]
  if (didMerge) return [green('Merge session done, no changes to review in this repo :)\n')]
  return [green('Sync done, no actions required :)\n')]
}
