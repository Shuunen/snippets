/* v8 ignore start */
import { padVisible, stripAnsi } from './merge-text.node'
import { colors, getSecondaryHints, glyphs, layout, primaryHints, type Hint } from './merge.options'

const { minHintGap } = layout

/**
 * Render one hint as a colored key badge followed by a dim description
 * @param hint the hint to render
 * @returns the rendered hint
 */
function formatHint(hint: Hint): string {
  const { description, key } = hint
  return `${colors.keyBadge(`[${key}]`)} ${colors.context(description)}`
}

/**
 * Space a row of already-rendered parts evenly across a target width (like CSS space-between),
 * so it spans the full width instead of sitting packed on the left
 * @param parts the rendered parts, in order
 * @param totalWidth the width to span
 * @returns the spaced-out line
 */
function spaceBetween(parts: string[], totalWidth: number): string {
  const gapCount = parts.length - 1
  if (gapCount <= 0) return parts.join('')
  const contentWidth = parts.reduce((sum, part) => sum + stripAnsi(part).length, 0)
  const totalGapWidth = Math.max(gapCount * minHintGap, totalWidth - contentWidth)
  const baseGapWidth = Math.floor(totalGapWidth / gapCount)
  const extraGaps = totalGapWidth % gapCount
  return parts.map((part, index) => (index < gapCount ? part + ' '.repeat(baseGapWidth + (index < extraGaps ? 1 : 0)) : part)).join('')
}

/**
 * Find each column's widest rendered hint across both hint rows, so badges line up vertically
 * @param rows the hint rows, each with the same number of columns
 * @returns each column's width
 */
function computeHintColumnWidths(rows: Hint[][]): number[] {
  const rowCount = rows[0]?.length ?? 0
  return Array.from({ length: rowCount }, (_unused, column) => Math.max(...rows.map(row => stripAnsi(formatHint(row[column])).length)))
}

/**
 * Render one row of hints, each cell padded to its shared column width so both rows align
 * @param row the row's hints, in column order
 * @param columnWidths each column's width
 * @param totalWidth the width to span
 * @returns the rendered row
 */
function renderHintRow(row: Hint[], columnWidths: number[], totalWidth: number): string {
  const cells = row.map((hint, index) => padVisible(formatHint(hint), columnWidths[index] ?? 0))
  return spaceBetween(cells, totalWidth)
}

/**
 * Print the two rows of keybinding hints, column-aligned and spaced across a given total width,
 * under a thin divider
 * @param totalWidth the width to span
 * @param wrapEnabled whether wrapping is currently on
 */
export function printHints(totalWidth: number, wrapEnabled: boolean) {
  const secondaryHints = getSecondaryHints(wrapEnabled)
  const hintColumnWidths = computeHintColumnWidths([primaryHints, secondaryHints])
  console.log(colors.divider(glyphs.boxHorizontal.repeat(totalWidth)))
  console.log(renderHintRow(primaryHints, hintColumnWidths, totalWidth))
  console.log(renderHintRow(secondaryHints, hintColumnWidths, totalWidth))
}
