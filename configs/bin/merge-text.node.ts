/* v8 ignore start */
import { highlight } from 'cli-highlight'
import wrapAnsi from 'wrap-ansi'
import { colors, glyphs } from './merge.options'

/**
 * Strip ANSI escape codes to measure the visible length of a string
 * @param text the text to measure
 * @returns the text without ANSI codes
 */
export function stripAnsi(text: string): string {
  return text.replaceAll(/\[[0-9;]*m/gu, '')
}

/**
 * Right-pad a (possibly colored) string to a visible width
 * @param text the text to pad
 * @param width the target visible width
 * @returns the padded text
 */
export function padVisible(text: string, width: number): string {
  const padding = Math.max(0, width - stripAnsi(text).length)
  return text + ' '.repeat(padding)
}

/**
 * Syntax-highlight a snippet of text, falling back to the raw text on any error
 * @param text the text to highlight
 * @param language the cli-highlight language
 * @returns the highlighted (or raw) text
 */
function highlightSafe(text: string, language: string | undefined): string {
  if (!language || !text) return text
  try {
    return highlight(text, { ignoreIllegals: true, language })
  } catch {
    return text
  }
}

/**
 * Highlight a whole logical line first (so the highlighter sees full context, not a mid-token
 * fragment), then hard-wrap the already-colored result, letting wrap-ansi carry styles across
 * the wrapped physical rows so colors never break or bleed at the wrap point.
 * @param line the raw logical line to highlight and wrap
 * @param width the max visible width of a wrapped row
 * @param language the cli-highlight language
 * @returns the highlighted, wrapped physical rows
 */
export function highlightAndWrap(line: string, width: number, language: string | undefined): string[] {
  const highlighted = highlightSafe(line, language)
  if (width <= 0) return [highlighted]
  return wrapAnsi(highlighted, width, { hard: true, trim: false, wordWrap: false }).split('\n')
}

/**
 * Highlight a logical line and collapse it to a single row, truncated with an ellipsis if it
 * doesn't fit, for the non-wrapping display mode. Wraps to `width - 1` first so the cut always
 * falls on a safe, ANSI-aware boundary, then appends a plain ellipsis character.
 * @param line the raw logical line to highlight and truncate
 * @param width the max visible width of the row
 * @param language the cli-highlight language
 * @returns the highlighted, single-row, truncated line
 */
function highlightAndTruncate(line: string, width: number, language: string | undefined): string {
  const fullRows = highlightAndWrap(line, width, language)
  if (fullRows.length <= 1) return fullRows[0] ?? ''
  const truncatedRows = highlightAndWrap(line, Math.max(1, width - 1), language)
  return `${truncatedRows[0] ?? ''}${glyphs.ellipsis}`
}

/**
 * Style a whole logical line as about-to-be-deleted first, then hard-wrap the already-styled
 * result, letting wrap-ansi carry the style across the wrapped physical rows.
 * @param line the raw logical line to style and wrap
 * @param width the max visible width of a wrapped row
 * @returns the styled, wrapped physical rows
 */
export function styleDeletedAndWrap(line: string, width: number): string[] {
  const styled = line ? colors.deletedContent(line) : line
  if (width <= 0) return [styled]
  return wrapAnsi(styled, width, { hard: true, trim: false, wordWrap: false }).split('\n')
}

/**
 * Style a logical line as about-to-be-deleted and collapse it to a single row, truncated with an
 * ellipsis if it doesn't fit, for the non-wrapping display mode
 * @param line the raw logical line to style and truncate
 * @param width the max visible width of the row
 * @returns the styled, single-row, truncated line
 */
function styleDeletedAndTruncate(line: string, width: number): string {
  const fullRows = styleDeletedAndWrap(line, width)
  if (fullRows.length <= 1) return fullRows[0] ?? ''
  const truncatedRows = styleDeletedAndWrap(line, Math.max(1, width - 1))
  return `${truncatedRows[0] ?? ''}${glyphs.ellipsis}`
}

/**
 * Prepare one conflict line, either wrapped across several rows or collapsed to a single
 * truncated row, depending on the current wrap mode. A line about to be deleted by a pending
 * choice skips syntax highlighting and is styled as struck-through instead, so it stays visible
 * rather than just disappearing from view.
 * @param line the raw logical line
 * @param options the line's target width, language, wrap mode, and whether it's about to be deleted
 * @returns the resulting row(s)
 */
export function prepareConflictLine(line: string, options: { deleted?: boolean; language: string | undefined; width: number; wrapEnabled: boolean }): string[] {
  const { deleted, language, width, wrapEnabled } = options
  if (deleted) return wrapEnabled ? styleDeletedAndWrap(line, width) : [styleDeletedAndTruncate(line, width)]
  return wrapEnabled ? highlightAndWrap(line, width, language) : [highlightAndTruncate(line, width, language)]
}
