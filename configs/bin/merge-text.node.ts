/* v8 ignore start */
import { highlight } from 'cli-highlight'
import wrapAnsi from 'wrap-ansi'
import type { CharSpan } from './merge-diff.node'
import { changeHighlightBackground, colors, glyphs } from './merge.options'

const ansiEscapePattern = /\[[0-9;]*m/uy

type WashToken = { isEscape: boolean; value: string }

/**
 * Split a (possibly already ANSI-colored) string into its ANSI escape codes and its individual
 * visible characters, so a later pass can count only the visible ones
 * @param text the text to tokenize
 * @returns the text's tokens, in order
 */
function tokenizeAnsi(text: string): WashToken[] {
  const tokens: WashToken[] = []
  let index = 0
  while (index < text.length) {
    ansiEscapePattern.lastIndex = index
    const escapeMatch = ansiEscapePattern.exec(text)
    if (escapeMatch) {
      tokens.push({ isEscape: true, value: escapeMatch[0] })
      index += escapeMatch[0].length
    } else {
      tokens.push({ isEscape: false, value: text[index] })
      index += 1
    }
  }
  return tokens
}

type WashState = { open: boolean; output: string; spanIndex: number; visible: number }

/**
 * Fold one token into the running wash state : escape codes pass through untouched, while a
 * visible character may open or close a background wash depending on where it falls among the
 * (ascending, non-overlapping) spans
 * @param state the running wash state, mutated in place
 * @param token the token to fold in
 * @param options the visible-character spans to wash, and the background's start/end ANSI codes
 */
function foldWashToken(state: WashState, token: WashToken, options: { background: { end: string; start: string }; spans: Array<{ end: number; start: number }> }): void {
  const { background, spans } = options
  if (token.isEscape) {
    state.output += token.value
    return
  }
  const currentSpan = spans[state.spanIndex]
  if (!state.open && currentSpan && state.visible === currentSpan.start) {
    state.output += background.start
    state.open = true
  }
  state.output += token.value
  state.visible += 1
  if (state.open && currentSpan && state.visible === currentSpan.end) {
    state.output += background.end
    state.open = false
    state.spanIndex += 1
  }
}

/**
 * Wash a set of `[start, end)` visible-character spans with a background color, skipping over any
 * ANSI escape codes already in the text (e.g. from syntax highlighting) so they pass through
 * untouched and the visible-character count used for the spans stays accurate
 * @param text the (possibly already ANSI-colored) text to wash
 * @param spans the visible-character spans to wash, in ascending, non-overlapping order
 * @param background the background's start/end ANSI codes
 * @returns the text with the spans washed
 */
export function washSpans(text: string, spans: Array<{ end: number; start: number }>, background: { end: string; start: string }): string {
  if (spans.length === 0) return text
  const state: WashState = { open: false, output: '', spanIndex: 0, visible: 0 }
  for (const token of tokenizeAnsi(text)) foldWashToken(state, token, { background, spans })
  if (state.open) state.output += background.end
  return state.output
}

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
 * @param options the cli-highlight language, and any changed-character spans to wash
 * @returns the highlighted, wrapped physical rows
 */
export function highlightAndWrap(line: string, width: number, options: { changeSpans?: CharSpan[]; language: string | undefined }): string[] {
  const { changeSpans = [], language } = options
  const highlighted = highlightSafe(line, language)
  const washed = washSpans(highlighted, changeSpans, changeHighlightBackground)
  if (width <= 0) return [washed]
  return wrapAnsi(washed, width, { hard: true, trim: false, wordWrap: false }).split('\n')
}

/**
 * Highlight a logical line and collapse it to a single row, truncated with an ellipsis if it
 * doesn't fit, for the non-wrapping display mode. Wraps to `width - 1` first so the cut always
 * falls on a safe, ANSI-aware boundary, then appends a plain ellipsis character.
 * @param line the raw logical line to highlight and truncate
 * @param width the max visible width of the row
 * @param options the cli-highlight language, and any changed-character spans to wash
 * @returns the highlighted, single-row, truncated line
 */
function highlightAndTruncate(line: string, width: number, options: { changeSpans?: CharSpan[]; language: string | undefined }): string {
  const fullRows = highlightAndWrap(line, width, options)
  if (fullRows.length <= 1) return fullRows[0] ?? ''
  const truncatedRows = highlightAndWrap(line, Math.max(1, width - 1), options)
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
 * @param options the line's target width, language, wrap mode, whether it's about to be deleted, and any changed-character spans to wash
 * @returns the resulting row(s)
 */
export function prepareConflictLine(line: string, options: { changeSpans?: CharSpan[]; deleted?: boolean; language: string | undefined; width: number; wrapEnabled: boolean }): string[] {
  const { changeSpans = [], deleted, language, width, wrapEnabled } = options
  if (deleted) return wrapEnabled ? styleDeletedAndWrap(line, width) : [styleDeletedAndTruncate(line, width)]
  return wrapEnabled ? highlightAndWrap(line, width, { changeSpans, language }) : [highlightAndTruncate(line, width, { changeSpans, language })]
}
