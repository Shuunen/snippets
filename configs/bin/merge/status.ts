import { readableTimeAgo } from 'shuutils'
import { type FileDetails, sides, type SyncFile } from '../core/types'
import { linesOf } from './blocks'
import { colors, type ColumnWidths, gap, glyphs } from './options'
import { guessLanguage, padVisible, truncateLine } from './text'

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
export function paneStatusLine(details: FileDetails, language: string | undefined, width: number): string {
  const lineCount = linesOf(details.content).length
  const summary = `utf8 · ${language ?? 'plain'} · ${lineCount} line${lineCount === 1 ? '' : 's'} · modified ${formatModifiedDate(details.modifiedAt)}`
  return truncateLine(summary, width)
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
 * Build the two boxes' bottom borders, each pane's status footer, and the trailing blank line
 * @param file the file being merged
 * @param widths the boxes' content widths
 * @returns the footer rows, top to bottom
 */
export function buildBoxFooter(file: SyncFile, widths: ColumnWidths): string[] {
  const language = guessLanguage(file.sides.repo.filepath)
  const status = sides.map(side => colors.context(padVisible(paneStatusLine(file.sides[side], language, widths[side]), widths[side])))
  // the spaces around the gap stand in for the box borders above, so each status line sits exactly
  // under its own pane's content rather than a column to its left
  return [sides.map(side => boxBottomLine(widths[side])).join(gap), ` ${status.join(` ${gap} `)} `, '']
}
