import { stripVTControlCharacters } from 'node:util'
import { highlight } from 'cli-highlight'
import { invariant } from 'es-toolkit'
import wrapAnsi from 'wrap-ansi'
import type { CharSpan, MergedSegment } from './char-diff'
import { changeHighlightBackground, colors, glyphs } from './options'

/**
 * Read an array slot that is known to be in bounds, failing loudly rather than silently yielding undefined
 * @param items the array to read from
 * @param index the in-bounds index
 * @returns the item at that index
 */
export function at<Item>(items: Item[], index: number): Item {
  const item = items[index]
  invariant(item !== undefined, `index ${index} should be within the ${items.length} available items`)
  return item
}

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
 * Render a merged line's segments : common text plain, the words it's about to lose struck through
 * red, and the words arriving from the winning side plain right where they land — so the side a
 * pending modification is about to overwrite reads as a real diff instead of either flipping
 * wholesale to the other side's words or losing its own with no sign of what replaces them
 * @param segments the line's ordered common / outgoing / incoming segments
 * @returns the rendered line
 */
export function renderMergedLine(segments: MergedSegment[]): string {
  return segments.map(segment => (segment.kind === 'outgoing' ? colors.deletedContent(segment.text) : segment.text)).join('')
}

/**
 * Strip ANSI escape codes to measure the visible length of a string
 * @param text the text to measure
 * @returns the text without ANSI codes
 */
export function stripAnsi(text: string): string {
  return stripVTControlCharacters(text)
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
 * Hard-wrap a list of plain-text lines to a fixed width, so none of them ever overflow a terminal
 * column and trigger the terminal's own line-wrapping (which misaligns a side-by-side layout)
 * @param lines the lines to wrap
 * @param width the max visible width of a wrapped chunk
 * @returns the wrapped lines, each at most `width` characters long
 */
export function wrapLines(lines: string[], width: number): string[] {
  if (width <= 0) return lines
  return lines.flatMap(line => {
    const codePoints = Array.from(line)
    if (codePoints.length <= width) return [line]
    const chunks: string[] = []
    for (let start = 0; start < codePoints.length; start += width) chunks.push(codePoints.slice(start, start + width).join(''))
    return chunks
  })
}

/**
 * Truncate a plain-text line to a width, marking the cut with an ellipsis, for a non-wrapping display mode
 * @param text the line to truncate
 * @param width the max visible width
 * @returns the truncated line
 */
export function truncateLine(text: string, width: number): string {
  const codePoints = Array.from(text)
  if (codePoints.length <= width || width <= 0) return codePoints.slice(0, Math.max(0, width)).join('')
  return `${codePoints.slice(0, Math.max(0, width - glyphs.ellipsis.length)).join('')}${glyphs.ellipsis}`
}

/**
 * Fit a list of plain-text lines to a width, wrapping them across rows or truncating each to one row
 * @param lines the lines to fit
 * @param width the max visible width
 * @param wrapEnabled whether wrapping is currently on
 * @returns the fitted lines
 */
export function fitLines(lines: string[], width: number, wrapEnabled: boolean): string[] {
  return wrapEnabled ? wrapLines(lines, width) : lines.map(line => truncateLine(line, width))
}

const languageByExtension: Record<string, string> = {
  '.bash_aliases': 'bash',
  '.bashrc': 'bash',
  '.desktop': 'ini',
  '.gitconfig': 'ini',
  '.json': 'json',
  '.md': 'markdown',
  '.profile': 'bash',
  '.sh': 'bash',
  '.toml': 'ini',
  '.yml': 'yaml',
}

/**
 * Guess a cli-highlight language from a filepath
 * @param filepath the filepath to guess the language from
 * @returns the language, or undefined if unknown
 */
export function guessLanguage(filepath: string): string | undefined {
  const match = Object.keys(languageByExtension).find(extension => filepath.endsWith(extension))
  return match ? languageByExtension[match] : undefined
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
 * Hard-wrap an already-styled line, letting wrap-ansi carry its styles across the wrapped physical
 * rows so colors never break or bleed at the wrap point
 * @param styled the already-styled line
 * @param width the max visible width of a row
 * @returns the wrapped physical rows
 */
function wrapStyled(styled: string, width: number): string[] {
  if (width <= 0) return [styled]
  return wrapAnsi(styled, width, { hard: true, trim: false, wordWrap: false }).split('\n')
}

/**
 * Lay an already-styled line out as rows : either every wrapped row, or a single row truncated with
 * an ellipsis. Truncating wraps to `width - 1` first so the cut always falls on a safe, ANSI-aware
 * boundary, then appends a plain ellipsis character.
 * @param styled the already-styled line
 * @param width the max visible width of a row
 * @param wrapEnabled whether wrapping is currently on
 * @returns the resulting row(s)
 */
function toRows(styled: string, width: number, wrapEnabled: boolean): string[] {
  const rows = wrapStyled(styled, width)
  if (wrapEnabled || rows.length <= 1) return rows
  return [`${at(wrapStyled(styled, Math.max(1, width - 1)), 0)}${glyphs.ellipsis}`]
}

/**
 * Prepare one conflict line, either wrapped across several rows or collapsed to a single
 * truncated row, depending on the current wrap mode. A line entirely dropped by a pending choice
 * skips syntax highlighting and is styled as struck-through instead, so it stays visible rather
 * than just disappearing from view. A line that survives as a merge of its own words and the words
 * replacing them (the side a pending modification is about to overwrite) instead skips
 * highlighting and renders as that merge, via `renderMergedLine`.
 * @param line the raw logical line
 * @param options the line's target width, language, wrap mode, whether it's about to be fully
 * deleted, its merged segments when it's surviving as a merge, and any changed-character spans to
 * wash when neither of those applies
 * @returns the resulting row(s)
 */
export function prepareConflictLine(line: string, options: { changeSpans?: CharSpan[]; deleted?: boolean; language?: string; merged?: MergedSegment[]; width: number; wrapEnabled: boolean }): string[] {
  const { changeSpans = [], deleted = false, language, merged, width, wrapEnabled } = options
  if (deleted) return toRows(line ? colors.deletedContent(line) : line, width, wrapEnabled)
  if (merged) return toRows(renderMergedLine(merged), width, wrapEnabled)
  return toRows(washSpans(highlightSafe(line, language), changeSpans, changeHighlightBackground), width, wrapEnabled)
}
