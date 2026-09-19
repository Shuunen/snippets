import { linesOf, type Block } from './merge-logic.node'

export type ContextAroundResult = {
  after: string[]
  /** the next conflict block's current text, once the true common context runs out, for a dimmed preview */
  afterPreview: string[] | undefined
  before: string[]
  /** the previous conflict block's current text, once the true common context runs out, for a dimmed preview */
  beforePreview: string[] | undefined
}

/**
 * Find the unchanged lines surrounding a conflict block, walking outward through every
 * consecutive common block on each side (not just the immediately adjacent one) until a
 * conflict block is hit, so a run of short common blocks doesn't starve the context view.
 * Once that happens, also surface that next conflict block's current text as a preview, so a
 * screen with room to spare shows what's coming up next instead of just going blank
 * @param blocks the full ordered list of blocks for the file
 * @param conflictBlock the conflict block to find context around
 * @returns the surrounding common lines (closest line last (before) / first (after)), plus each
 * side's preview of the next conflict block beyond that, if any
 */
export function contextAround(blocks: Block[], conflictBlock: Block): ContextAroundResult {
  const index = blocks.indexOf(conflictBlock)
  const before: string[] = []
  let beforeCursor = index - 1
  for (; beforeCursor >= 0 && blocks[beforeCursor]?.type === 'common'; beforeCursor -= 1) before.unshift(...linesOf(blocks[beforeCursor]?.destText ?? ''))
  const beforePreviewLines = beforeCursor >= 0 ? linesOf(blocks[beforeCursor]?.destText ?? '') : []
  const after: string[] = []
  let afterCursor = index + 1
  for (; afterCursor < blocks.length && blocks[afterCursor]?.type === 'common'; afterCursor += 1) after.push(...linesOf(blocks[afterCursor]?.destText ?? ''))
  const afterPreviewLines = afterCursor < blocks.length ? linesOf(blocks[afterCursor]?.destText ?? '') : []
  return { after, afterPreview: afterPreviewLines.length > 0 ? afterPreviewLines : undefined, before, beforePreview: beforePreviewLines.length > 0 ? beforePreviewLines : undefined }
}

const budgetSplit = 2

/**
 * Pick as much of the available before/after context as fits in a row budget, splitting it evenly
 * and letting one side use the other's leftover when it runs out of lines first
 * @param before the available context lines before the conflict, closest line last
 * @param after the available context lines after the conflict, closest line first
 * @param budget the total number of context rows available
 * @returns the context lines that fit, same ordering as the input
 */
export function pickContext(before: string[], after: string[], budget: number): { after: string[]; before: string[] } {
  if (budget <= 0) return { after: [], before: [] }
  const half = Math.floor(budget / budgetSplit)
  const beforeCount = Math.min(half, before.length)
  const afterCount = Math.min(budget - beforeCount, after.length)
  const leftover = budget - beforeCount - afterCount
  const finalBeforeCount = leftover > 0 ? Math.min(beforeCount + leftover, before.length) : beforeCount
  return { after: after.slice(0, afterCount), before: before.slice(before.length - finalBeforeCount) }
}
