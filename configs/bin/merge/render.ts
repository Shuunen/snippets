import { type BySide, type Side, sides, type SyncFile } from '../types'
import { homeDir } from '../utils'
import type { Block } from './blocks'
import { type CharSpan, resolveDisplaySpans } from './char-diff'
import { contextAround, pickContext } from './context'
import { buildHints } from './hints'
import { type BlockChangeKind, otherSide, resolveBlockPreview, resolveDisplayKind, resolveRowKinds } from './navigation'
import { colors, type ColumnWidths, gap, glyphs, layout, modifiedSuffix, selectionBackground } from './options'
import { buildBoxFooter } from './status'
import { fitLines, guessLanguage, padVisible, prepareConflictLine, truncateLine } from './text'

const { chromeRowCount, fallbackTerminalRows, fallbackTerminalWidth, gutterWidth, minColumnWidth, perBoxBorderWidth, titleSideCharsWidth } = layout
const columnCount = 2
const titleHalfSplit = 2

export type FileContext = { blocks: Block[]; file: SyncFile; fileIndex: number; fileTotal: number }

export type BlockContext = {
  block: Block
  blockIndex: number
  blockTotal: number
  /** whether each side will be overwritten by a choice made in this session */ modified: BySide<boolean>
  pending: Side | undefined
  wrapEnabled: boolean
}

/**
 * Wash a string with a subtle highlight background, to mark it as part of the selected block
 * without the harshness of a fully-saturated background color
 * @param text the text to highlight
 * @returns the highlighted text
 */
function highlightBackground(text: string): string {
  return `${selectionBackground.start}${text}${selectionBackground.end}`
}

/**
 * Split the terminal width between the two boxes' content areas, leaving room for their borders and the gap
 * @param terminalWidth the current terminal width, in columns
 * @returns the content width of each box (borders excluded)
 */
export function computeColumnWidths(terminalWidth: number): ColumnWidths {
  // usable is at least minColumnWidth * columnCount, so neither half can fall under the minimum
  const usable = Math.max(minColumnWidth * columnCount, terminalWidth - gap.length - perBoxBorderWidth * columnCount)
  const repo = Math.floor(usable / columnCount)
  return { local: usable - repo, repo }
}

/**
 * Shorten a path under the home directory to a ~-prefixed one, for a shorter box title
 * @param filepath the path to shorten
 * @returns the shortened path
 */
export function shortenPath(filepath: string): string {
  const home = homeDir()
  return home && filepath.startsWith(home) ? `~${filepath.slice(home.length)}` : filepath
}

/**
 * Truncate a title to a width, keeping both its start (e.g. the drive/home root) and its end
 * (e.g. the filename and any status suffix) visible, eliding the middle when it doesn't fit
 * @param title the title to truncate
 * @param width the max visible width
 * @returns the truncated title
 */
export function truncateTitle(title: string, width: number): string {
  if (title.length <= width || width <= 1) return title.slice(0, Math.max(0, width))
  const remaining = width - glyphs.ellipsis.length
  const headWidth = Math.max(0, Math.ceil(remaining / titleHalfSplit))
  const tailWidth = Math.max(0, remaining - headWidth)
  return `${title.slice(0, headWidth)}${glyphs.ellipsis}${title.slice(title.length - tailWidth)}`
}

/**
 * Build a box's top border, with its title embedded, highlighted when it's the pending choice,
 * and marked (modified) once something in this session will change it
 * @param title the box's title
 * @param contentWidth the box's inner content width
 * @param state whether this box is the pending choice, and/or already modified
 * @returns the top border line
 */
export function boxTopLine(title: string, contentWidth: number, state: { isHighlighted: boolean; isModified: boolean }): string {
  const { isHighlighted, isModified } = state
  const fullTitle = isModified ? `${title}${modifiedSuffix}` : title
  const label = ` ${truncateTitle(fullTitle, Math.max(1, contentWidth - titleSideCharsWidth))} `
  const dashesAfter = Math.max(1, contentWidth - 1 - label.length)
  const line = `${glyphs.boxTopLeft}${glyphs.boxHorizontal}${label}${glyphs.boxHorizontal.repeat(dashesAfter)}${glyphs.boxTopRight}`
  return isHighlighted ? colors.selectedSide(line) : line
}

/**
 * Build one bordered, gap-separated row of the two boxes, optionally washed with a subtle
 * background on both sides to mark it as the currently selected block, and with the gap between
 * them replaced by an arrow showing which side the user's choice would flow into
 * @param row the row's content and styling
 * @returns the rendered row
 */
function boxRow(row: { cells: BySide<string>; gapContent?: string; isSelected?: boolean; widths: ColumnWidths }): string {
  const { cells, gapContent = gap, isSelected = false, widths } = row
  const styled = sides.map(side => {
    const padded = padVisible(cells[side], widths[side])
    return isSelected ? highlightBackground(padded) : padded
  })
  return `${glyphs.boxVertical}${styled[0]}${glyphs.boxVertical}${gapContent}${glyphs.boxVertical}${styled[1]}${glyphs.boxVertical}`
}

const colorByKind: Record<BlockChangeKind, (text: string) => string> = { addition: colors.addition, modification: colors.modification, removal: colors.removal }

/**
 * Build the gap marker for one row, showing which direction the pending choice (if any) would
 * flow: an arrow pointing at the side that will be overwritten, colored by what confirming would
 * do to that very row — green where it gains a line, red where it loses one, yellow where it swaps
 * one for another. Dim and undecided-looking while nothing is chosen yet
 * @param kind what the pending choice would do at this row
 * @param pending the side currently highlighted, if any
 * @param fallbackKind the block's overall kind, for a row the choice leaves untouched
 * @returns the gap content, exactly `gap.length` visible characters wide
 */
function gapMarker(kind: BlockChangeKind | undefined, pending: Side | undefined, fallbackKind: BlockChangeKind): string {
  if (!pending) return `${colors.pendingChoice(glyphs.pendingMarker)} `
  const arrow = pending === 'local' ? glyphs.arrowToLeft : glyphs.arrowToRight
  return `${colorByKind[kind ?? fallbackKind](arrow)} `
}

const gutterByKind: Record<BlockChangeKind, string> = {
  addition: `${colors.addition(glyphs.gutterBar)} `,
  modification: `${colors.modification(glyphs.gutterBar)} `,
  removal: `${colors.removal(glyphs.gutterBar)} `,
}
const blankGutter = ' '.repeat(gutterWidth)
const previewGutter = `${colors.preview(glyphs.previewBar)} `

/**
 * Build dimmed, non-interactive rows shown identically on both sides : either the true common
 * context around the block, or a preview of the next/previous conflict once that context runs out.
 * A preview is styled and gutter-marked distinctly from real context, so it never reads as actual
 * agreement between the two sides. Both get the same gutter width reserved as conflict rows, so
 * text stays aligned across every row of the panel.
 * @param lines the lines to render
 * @param widths the boxes' content widths
 * @param isPreview true for preview lines, false for true context
 * @returns the rendered rows
 */
function asideRows(lines: string[], widths: ColumnWidths, isPreview: boolean): string[] {
  const gutter = isPreview ? previewGutter : blankGutter
  const color = isPreview ? colors.preview : colors.context
  return lines.map(line => boxRow({ cells: { local: `${gutter}${color(line)}`, repo: `${gutter}${color(line)}` }, widths }))
}

/**
 * Pick one side's gutter marker for one row, colored by what happens at that row rather than by
 * what the block is as a whole — so a modification that also drops a line shows yellow on the row
 * it swaps and red on the row it drops. With no pending choice yet, both addition and removal are
 * marked on the live side — the backup hasn't changed, it's the live file that either gained a line
 * (green) or is missing one the backup has (red). Once a choice is pending, the marker instead
 * follows the side that would actually be overwritten. A line that exists on both sides but changed
 * always gets yellow on both. Blank wherever a side has nothing to show, or nothing happens to it.
 * @param side the side to mark
 * @param kind what happens at this row, if anything
 * @param pending the side currently chosen to win, if any
 * @returns that side's gutter marker for that row
 */
export function gutterFor(side: Side, kind: BlockChangeKind | undefined, pending: Side | undefined): string {
  if (!kind) return blankGutter
  if (kind === 'modification') return gutterByKind.modification
  // with nothing chosen yet the marker sits on the live side, since the backup is what hasn't changed
  const marked = pending ? otherSide(pending) : 'local'
  return side === marked ? gutterByKind[kind] : blankGutter
}

type ConflictOptions = { file: SyncFile; pending: Side | undefined; widths: ColumnWidths; wrapEnabled: boolean }

export type ConflictRow = {
  cells: BySide<string>
  /** what happens at this row, driving its gutter and arrow color */ kind: BlockChangeKind | undefined
}

/**
 * Wrap and highlight a conflict block's two sides, one logical line at a time so the two boxes stay
 * line-for-line aligned even when a long line wraps on one side only. Both sides always reserve a
 * small gutter column so text never shifts, colored by what happens at that row (see `gutterFor`).
 * While a side is pending, the side that would be overwritten previews the incoming content instead
 * of its own, and any line it loses in the process stays on screen struck through rather than just
 * vanishing — whether the overwrite wipes the side out entirely or merely shrinks it.
 * @param block the block to resolve
 * @param options the file being merged, the boxes' widths, wrap mode, and pending side
 * @returns one entry per row, holding both sides' cells and what that row means
 */
function computeConflictRows(block: Block, options: ConflictOptions): ConflictRow[] {
  const { file, pending, widths, wrapEnabled } = options
  const language = guessLanguage(file.sides.repo.filepath)
  const preview = resolveBlockPreview(block, pending)
  const kinds = resolveRowKinds(block, pending)
  // a deleted line is struck through rather than highlighted, so its spans are never consulted
  const spans: BySide<CharSpan[]> = resolveDisplayKind(block, pending) === 'modification' ? resolveDisplaySpans(block, pending) : { local: [], repo: [] }
  const rowsFor = (side: Side, lineIndex: number, kind: BlockChangeKind | undefined): string[] => {
    const gutter = gutterFor(side, kind, pending)
    const line = preview[side][lineIndex]
    // a side with nothing at this line still gets one row, so its gutter marker has somewhere to sit
    if (!line) return [gutter]
    const width = Math.max(1, widths[side] - gutterWidth)
    return prepareConflictLine(line.text, { changeSpans: spans[side].filter(span => span.line === lineIndex), deleted: line.isDeleted, language, width, wrapEnabled }).map(row => `${gutter}${row}`)
  }
  return kinds.flatMap((kind, lineIndex) => {
    const rows: BySide<string[]> = { local: rowsFor('local', lineIndex, kind), repo: rowsFor('repo', lineIndex, kind) }
    return Array.from({ length: Math.max(rows.repo.length, rows.local.length) }, (_unused, index) => ({ cells: { local: rows.local[index] ?? '', repo: rows.repo[index] ?? '' }, kind }))
  })
}

type ShownContext = { after: string[]; afterPreview: string[]; before: string[]; beforePreview: string[] }

type ShownContextOptions = { block: Block; blocks: Block[]; conflictRowCount: number; terminalRows: number; widths: ColumnWidths; wrapEnabled: boolean }

/**
 * Pick as much surrounding context as fits in whatever terminal height is left, then spend any
 * leftover budget previewing the next/previous conflict block's current text, so a tall terminal
 * with little real context doesn't just sit mostly blank
 * @param options the context selection inputs
 * @returns the context lines that fit, plus each side's preview lines (if any fit)
 */
function computeShownContext(options: ShownContextOptions): ShownContext {
  const { block, blocks, conflictRowCount, terminalRows, widths, wrapEnabled } = options
  const { after, afterPreview, before, beforePreview } = contextAround(blocks, block)
  const contextWidth = Math.min(widths.repo, widths.local) - gutterWidth
  const fit = (lines: string[]) => fitLines(lines, contextWidth, wrapEnabled)
  const budget = Math.max(0, terminalRows - chromeRowCount - conflictRowCount)
  const trueContext = pickContext(fit(before), fit(after), budget)
  const leftoverBudget = Math.max(0, budget - trueContext.before.length - trueContext.after.length)
  const previewContext = pickContext(fit(beforePreview ?? []), fit(afterPreview ?? []), leftoverBudget)
  return { after: trueContext.after, afterPreview: previewContext.after, before: trueContext.before, beforePreview: previewContext.before }
}

/**
 * Build the two boxes' top borders, titled with each side's path, side that's pending highlighted
 * and marked (modified) once something in this session will overwrite it
 * @param file the file being merged
 * @param widths the boxes' content widths
 * @param state the pending/modified state
 * @returns the top border row
 */
function boxTopRow(file: SyncFile, widths: ColumnWidths, state: { modified: BySide<boolean>; pending: Side | undefined }): string {
  const { modified, pending } = state
  return sides.map(side => boxTopLine(shortenPath(file.sides[side].filepath), widths[side], { isHighlighted: pending === otherSide(side), isModified: modified[side] })).join(gap)
}

/**
 * Build the whole merge panel for one conflicting block, with as much surrounding context as fits
 * @param fileContext the file being merged
 * @param blockContext the block being resolved
 * @returns the panel's rows, top to bottom, ready to be drawn in one write
 */
export function buildPanel(fileContext: FileContext, blockContext: BlockContext): string[] {
  const { blocks, file, fileIndex, fileTotal } = fileContext
  const { block, blockIndex, blockTotal, modified, pending, wrapEnabled } = blockContext
  const widths = computeColumnWidths(process.stdout.columns ?? fallbackTerminalWidth)
  const conflictRows = computeConflictRows(block, { file, pending, widths, wrapEnabled })
  const terminalRows = process.stdout.rows ?? fallbackTerminalRows
  const { after, afterPreview, before, beforePreview } = computeShownContext({ block, blocks, conflictRowCount: conflictRows.length, terminalRows, widths, wrapEnabled })
  const blockKind = resolveDisplayKind(block, pending)
  const totalWidth = widths.repo + widths.local + perBoxBorderWidth * columnCount + gap.length
  return [
    colors.context(truncateLine(`file ${fileIndex}/${fileTotal}    block ${blockIndex}/${blockTotal}`, totalWidth)),
    '',
    boxTopRow(file, widths, { modified, pending }),
    ...asideRows(beforePreview, widths, true),
    ...asideRows(before, widths, false),
    ...conflictRows.map(row => boxRow({ cells: row.cells, gapContent: gapMarker(row.kind, pending, blockKind), isSelected: true, widths })),
    ...asideRows(after, widths, false),
    ...asideRows(afterPreview, widths, true),
    ...buildBoxFooter(file, widths),
    ...buildHints(totalWidth, wrapEnabled),
  ]
}
