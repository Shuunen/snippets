import { contextAround, pickContext } from './merge-context.node'
import { resolveDisplaySpans, type CharSpan } from './merge-diff.node'
import { printHints } from './merge-hints.node'
/* v8 ignore start */
import { classifyBlockChange, guessLanguage, linesOf, resolveBlockPreview, resolvePendingKind, truncateLine, wrapLines, type Block, type BlockChangeKind, type Side } from './merge-logic.node'
import { padVisible, prepareConflictLine } from './merge-text.node'
import { colors, glyphs, layout, modifiedSuffix, selectionBackground } from './merge.options'
import type { File } from './types'
import { logger } from './utils.node'

const { chromeRowCount, fallbackTerminalRows, fallbackTerminalWidth, gapWidth, gutterWidth, minColumnWidth, perBoxBorderWidth, titleSideCharsWidth } = layout
const columnCount = 2
const gap = ' '.repeat(gapWidth)

export type FileContext = { blocks: Block[]; file: File; fileIndex: number; fileTotal: number }

export type BlockContext = {
  block: Block
  blockIndex: number
  blockTotal: number
  destModified: boolean
  pending: Side | undefined
  sourceModified: boolean
  wrapEnabled: boolean
}

export type ColumnWidths = { leftWidth: number; rightWidth: number }

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
function computeColumnWidths(terminalWidth: number): ColumnWidths {
  const usable = Math.max(minColumnWidth * columnCount, terminalWidth - gap.length - perBoxBorderWidth * columnCount)
  const leftWidth = Math.max(minColumnWidth, Math.floor(usable / columnCount))
  const rightWidth = Math.max(minColumnWidth, usable - leftWidth)
  return { leftWidth, rightWidth }
}

/**
 * Shorten a path under the home directory to a ~-prefixed one, for a shorter box title
 * @param filepath the path to shorten
 * @returns the shortened path
 */
function shortenPath(filepath: string): string {
  const home = process.env.HOME ?? ''
  return home && filepath.startsWith(home) ? `~${filepath.slice(home.length)}` : filepath
}

/**
 * Truncate a title to a width, keeping both its start (e.g. the drive/home root) and its end
 * (e.g. the filename and any status suffix) visible, eliding the middle when it doesn't fit
 * @param title the title to truncate
 * @param width the max visible width
 * @returns the truncated title
 */
const titleHalfSplit = 2

function truncateTitle(title: string, width: number): string {
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
function boxTopLine(title: string, contentWidth: number, state: { isHighlighted: boolean; isModified: boolean }): string {
  const { isHighlighted, isModified } = state
  const fullTitle = isModified ? `${title}${modifiedSuffix}` : title
  const label = ` ${truncateTitle(fullTitle, Math.max(1, contentWidth - titleSideCharsWidth))} `
  const dashesAfter = Math.max(1, contentWidth - 1 - label.length)
  const line = `${glyphs.boxTopLeft}${glyphs.boxHorizontal}${label}${glyphs.boxHorizontal.repeat(dashesAfter)}${glyphs.boxTopRight}`
  return isHighlighted ? colors.selectedSide(line) : line
}

/**
 * Build a box's bottom border
 * @param contentWidth the box's inner content width
 * @returns the bottom border line
 */
function boxBottomLine(contentWidth: number): string {
  return `${glyphs.boxBottomLeft}${glyphs.boxHorizontal.repeat(contentWidth)}${glyphs.boxBottomRight}`
}

/**
 * Print one bordered, gap-separated row of the two boxes, optionally washed with a subtle
 * background on both sides to mark it as the currently selected block, and with the gap between
 * them replaced by an arrow showing which side the user's choice would flow into
 * @param row the row's content and styling
 */
function printBoxRow(row: { gapContent?: string; isSelected?: boolean; left: string; right: string; widths: ColumnWidths }) {
  const { gapContent = gap, isSelected = false, left, right, widths } = row
  const paddedLeft = padVisible(left, widths.leftWidth)
  const paddedRight = padVisible(right, widths.rightWidth)
  const styledLeft = isSelected ? highlightBackground(paddedLeft) : paddedLeft
  const styledRight = isSelected ? highlightBackground(paddedRight) : paddedRight
  console.log(`${glyphs.boxVertical}${styledLeft}${glyphs.boxVertical}${gapContent}${glyphs.boxVertical}${styledRight}${glyphs.boxVertical}`)
}

/**
 * Build the gap marker between the two boxes for a row, showing which direction the pending
 * choice (if any) would flow: an arrow pointing at the side that will be overwritten, colored by
 * what that overwrite would actually do to it. Dim and undecided-looking while nothing is chosen yet
 * @param pending the side currently highlighted, if any
 * @param block the block being resolved
 * @returns the gap content, exactly `gap.length` visible characters wide
 */
const colorByKind: Record<BlockChangeKind, (text: string) => string> = { addition: colors.addition, modification: colors.modification, removal: colors.removal }

function gapMarker(pending: Side | undefined, block: Block): string {
  if (!pending) return `${colors.pendingChoice(glyphs.pendingMarker)} `
  const kind = resolvePendingKind(block, pending)
  const arrow = pending === 'source' ? glyphs.arrowToLeft : glyphs.arrowToRight
  return `${colorByKind[kind](arrow)} `
}

const additionGutter = `${colors.addition(glyphs.gutterBar)} `
const removalGutter = `${colors.removal(glyphs.gutterBar)} `
const modificationGutter = `${colors.modification(glyphs.gutterBar)} `
const blankGutter = ' '.repeat(gutterWidth)
const previewGutter = `${colors.preview(glyphs.previewBar)} `

/**
 * Print a list of dimmed, non-interactive context lines, identical on both sides. Both sides get
 * the same blank gutter reserved for conflict lines, so text stays aligned across both.
 * @param lines the lines to print
 * @param widths the boxes' content widths
 */
function printContextLines(lines: string[], widths: ColumnWidths) {
  for (const line of lines) printBoxRow({ left: `${blankGutter}${colors.context(line)}`, right: `${blankGutter}${colors.context(line)}`, widths })
}

/**
 * Print a list of preview lines for the next/previous conflict block, once the true common
 * context has run out, so idle vertical space shows what's coming up instead of going blank.
 * Styled and gutter-marked distinctly from real context, so it never reads as actual agreement
 * between the two sides
 * @param lines the lines to print
 * @param widths the boxes' content widths
 */
function printPreviewLines(lines: string[], widths: ColumnWidths) {
  for (const line of lines) printBoxRow({ left: `${previewGutter}${colors.preview(line)}`, right: `${previewGutter}${colors.preview(line)}`, widths })
}

/**
 * Pick each side's gutter marker for a conflict block. With no pending choice yet, both addition
 * and removal are marked on the live side — the backup hasn't changed, it's the live file that
 * either gained a line (green) or is missing one the backup has (red). Once a choice is pending,
 * the marker instead follows the side that would actually be overwritten, colored by what that
 * overwrite would do to it (gain content : green, lose content : red). A line that exists on both
 * sides but changed always gets yellow on both. Blank wherever a side has nothing to show.
 * @param block the block to resolve
 * @param pending the side currently chosen to win, if any
 * @returns each side's gutter marker
 */
function gutterFor(block: Block, pending: Side | undefined): { dest: string; source: string } {
  if (!pending) {
    const kind = classifyBlockChange(block)
    if (kind === 'addition') return { dest: blankGutter, source: additionGutter }
    if (kind === 'removal') return { dest: blankGutter, source: removalGutter }
    return { dest: modificationGutter, source: modificationGutter }
  }
  const kind = resolvePendingKind(block, pending)
  if (kind === 'modification') return { dest: modificationGutter, source: modificationGutter }
  const marker = kind === 'addition' ? additionGutter : removalGutter
  const overwritten: Side = pending === 'dest' ? 'source' : 'dest'
  return overwritten === 'dest' ? { dest: marker, source: blankGutter } : { dest: blankGutter, source: marker }
}

/**
 * Wrap and highlight a conflict block's two sides. Both sides always reserve a small gutter column
 * so text never shifts, colored to show what kind of change this block is (see `gutterFor`). While
 * a side is pending, the side that would be overwritten previews the incoming content instead of
 * its own, so the effect of confirming is visible before it happens. When that overwrite would
 * delete the side's own content outright (rather than replace it with something else), its
 * original text is kept on screen and struck through instead of just vanishing.
 * @param file the file being merged
 * @param block the block to resolve
 * @param options the boxes' widths, wrap mode, and pending side
 * @returns the wrapped, highlighted lines and their row count
 */
function computeConflictLines(file: File, block: Block, options: { pending: Side | undefined; widths: ColumnWidths; wrapEnabled: boolean }): { destLines: string[]; rowCount: number; sourceLines: string[] } {
  const { pending, widths, wrapEnabled } = options
  const language = guessLanguage(file.destination.filepath)
  const gutter = gutterFor(block, pending)
  const preview = resolveBlockPreview(block, pending)
  const kind = pending ? resolvePendingKind(block, pending) : classifyBlockChange(block)
  const showsBothSides = kind === 'modification' && !preview.destDeleted && !preview.sourceDeleted
  const { destSpans, sourceSpans }: { destSpans: CharSpan[]; sourceSpans: CharSpan[] } = showsBothSides ? resolveDisplaySpans(block, pending) : { destSpans: [], sourceSpans: [] }
  const destWrapWidth = Math.max(1, widths.leftWidth - gutterWidth)
  const destBodyLines = linesOf(preview.destText).flatMap((line, lineIndex) =>
    prepareConflictLine(line, { changeSpans: destSpans.filter(span => span.line === lineIndex), deleted: preview.destDeleted, language, width: destWrapWidth, wrapEnabled }),
  )
  const sourceWrapWidth = Math.max(1, widths.rightWidth - gutterWidth)
  const sourceBodyLines = linesOf(preview.sourceText).flatMap((line, lineIndex) =>
    prepareConflictLine(line, { changeSpans: sourceSpans.filter(span => span.line === lineIndex), deleted: preview.sourceDeleted, language, width: sourceWrapWidth, wrapEnabled }),
  )
  const rowCount = Math.max(destBodyLines.length, sourceBodyLines.length, 1)
  // always emit `rowCount` rows on both sides, even past the end of a shorter (or empty) body,
  // so a gutter marker on an otherwise-empty side (e.g. red for a removal) still has a row to sit on
  const destLines = Array.from({ length: rowCount }, (_unused, index) => `${gutter.dest}${destBodyLines[index] ?? ''}`)
  const sourceLines = Array.from({ length: rowCount }, (_unused, index) => `${gutter.source}${sourceBodyLines[index] ?? ''}`)
  return { destLines, rowCount, sourceLines }
}

/**
 * Pick as much surrounding context as fits in whatever terminal height is left, then spend any
 * leftover budget previewing the next/previous conflict block's current text, so a tall terminal
 * with little real context doesn't just sit mostly blank
 * @param options the context selection inputs
 * @returns the context lines that fit, plus each side's preview lines (if any fit)
 */
function computeShownContext(options: { block: Block; blocks: Block[]; conflictRowCount: number; terminalRows: number; widths: ColumnWidths; wrapEnabled: boolean }): {
  after: string[]
  afterPreview: string[]
  before: string[]
  beforePreview: string[]
} {
  const { block, blocks, conflictRowCount, terminalRows, widths, wrapEnabled } = options
  const { after, afterPreview, before, beforePreview } = contextAround(blocks, block)
  const contextWidth = Math.min(widths.leftWidth, widths.rightWidth) - gutterWidth
  const prepare: (lines: string[]) => string[] = wrapEnabled ? lines => wrapLines(lines, contextWidth) : lines => lines.map(line => truncateLine(line, contextWidth, glyphs.ellipsis))
  const budget = Math.max(0, terminalRows - chromeRowCount - conflictRowCount)
  const trueContext = pickContext(prepare(before), prepare(after), budget)
  const leftoverBudget = Math.max(0, budget - trueContext.before.length - trueContext.after.length)
  const previewContext = pickContext(prepare(beforePreview ?? []), prepare(afterPreview ?? []), leftoverBudget)
  return { after: trueContext.after, afterPreview: previewContext.after, before: trueContext.before, beforePreview: previewContext.before }
}

/**
 * Print the two boxes' top borders, titled with each side's path, side that's pending highlighted
 * and marked (modified) once something in this session will overwrite it
 * @param file the file being merged
 * @param widths the boxes' content widths
 * @param state the pending/modified state
 */
function printBoxTop(file: File, widths: ColumnWidths, state: { destModified: boolean; pending: Side | undefined; sourceModified: boolean }) {
  const { destModified, pending, sourceModified } = state
  const leftTop = boxTopLine(shortenPath(file.destination.filepath), widths.leftWidth, { isHighlighted: pending === 'source', isModified: destModified })
  const rightTop = boxTopLine(shortenPath(file.source.filepath), widths.rightWidth, { isHighlighted: pending === 'dest', isModified: sourceModified })
  console.log(`${leftTop}${gap}${rightTop}`)
}

/**
 * Print the two boxes' bottom borders
 * @param widths the boxes' content widths
 */
function printBoxBottom(widths: ColumnWidths) {
  console.log(`${boxBottomLine(widths.leftWidth)}${gap}${boxBottomLine(widths.rightWidth)}`)
}

/**
 * Render one conflicting block to the terminal, with as much surrounding context as fits
 * @param fileContext the file being merged
 * @param blockContext the block being resolved
 */
export function renderBlock(fileContext: FileContext, blockContext: BlockContext) {
  const { blocks, file, fileIndex, fileTotal } = fileContext
  const { block, blockIndex, blockTotal, destModified, pending, sourceModified, wrapEnabled } = blockContext
  console.clear()
  const widths = computeColumnWidths(process.stdout.columns ?? fallbackTerminalWidth)
  const { destLines, rowCount, sourceLines } = computeConflictLines(file, block, { pending, widths, wrapEnabled })
  const terminalRows = process.stdout.rows ?? fallbackTerminalRows
  const { after, afterPreview, before, beforePreview } = computeShownContext({ block, blocks, conflictRowCount: rowCount, terminalRows, widths, wrapEnabled })
  logger.info(`file ${fileIndex}/${fileTotal}    block ${blockIndex}/${blockTotal}`)
  console.log('')
  printBoxTop(file, widths, { destModified, pending, sourceModified })
  printPreviewLines(beforePreview, widths)
  printContextLines(before, widths)
  const gapContent = gapMarker(pending, block)
  for (let index = 0; index < rowCount; index += 1) printBoxRow({ gapContent, isSelected: true, left: destLines[index] ?? '', right: sourceLines[index] ?? '', widths })
  printContextLines(after, widths)
  printPreviewLines(afterPreview, widths)
  printBoxBottom(widths)
  console.log('')
  const totalWidth = widths.leftWidth + widths.rightWidth + perBoxBorderWidth * columnCount + gap.length
  printHints(totalWidth, wrapEnabled)
}
