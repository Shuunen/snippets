/* v8 ignore start */
import { readableTimeAgo } from 'shuutils'
import { guessLanguage, linesOf, truncateLine } from './merge-logic.node'
import type { ColumnWidths } from './merge-render.node'
import { padVisible } from './merge-text.node'
import { colors, glyphs, layout } from './merge.options'
import type { File, FileDetails } from './types'

const gap = ' '.repeat(layout.gapWidth)

/**
 * Format a file's last-modified date as a readable "time ago" string, or a placeholder when it doesn't exist yet
 * @param modifiedAt the file's modification date, if it exists
 * @returns the formatted date
 */
function formatModifiedDate(modifiedAt: Date | undefined): string {
  return modifiedAt ? readableTimeAgo(modifiedAt) : 'not created yet'
}

/**
 * Build one pane's status line : encoding, guessed filetype, line count, and last-modified date,
 * truncated to fit the pane's width
 * @param details the pane's file details
 * @param language the guessed cli-highlight language, if any
 * @param width the pane's content width
 * @returns the status line
 */
function paneStatusLine(details: FileDetails, language: string | undefined, width: number): string {
  const lineCount = linesOf(details.content).length
  const summary = `utf8 · ${language ?? 'plain'} · ${lineCount} line${lineCount === 1 ? '' : 's'} · modified ${formatModifiedDate(details.modifiedAt)}`
  return truncateLine(summary, width, glyphs.ellipsis)
}

/**
 * Print each pane's status footer under its box, aligned with the box's content area
 * @param file the file being merged
 * @param widths the boxes' content widths
 */
function printPaneStatus(file: File, widths: ColumnWidths) {
  const language = guessLanguage(file.destination.filepath)
  const left = paneStatusLine(file.destination, language, widths.leftWidth)
  const right = paneStatusLine(file.source, language, widths.rightWidth)
  console.log(` ${colors.context(padVisible(left, widths.leftWidth))} ${gap}${colors.context(padVisible(right, widths.rightWidth))} `)
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
 * Print the two boxes' bottom borders
 * @param widths the boxes' content widths
 */
function printBoxBottom(widths: ColumnWidths) {
  console.log(`${boxBottomLine(widths.leftWidth)}${gap}${boxBottomLine(widths.rightWidth)}`)
}

/**
 * Print the two boxes' bottom borders, each pane's status footer, and the trailing blank line
 * @param file the file being merged
 * @param widths the boxes' content widths
 */
export function printBoxFooter(file: File, widths: ColumnWidths) {
  printBoxBottom(widths)
  printPaneStatus(file, widths)
  console.log('')
}
