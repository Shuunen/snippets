import { diffWordsWithSpace } from 'diff'
import type { BySide, Side } from '../types'
import type { Block } from './blocks'

export type CharSpan = { end: number; line: number; start: number }

type Cursor = { column: number; line: number }

/**
 * Walk one diff chunk's text, splitting it on line breaks and, while inside a chunk that's unique
 * to one side, recording a `[start, end)` span (in that line's own character offsets) for each
 * line it touches, so the caller can wash exactly those characters instead of a whole line
 * @param text the diff chunk's raw text
 * @param options the span list to append to (mutated in place), the current line/column position
 * on this side (mutated in place), and whether this chunk is unique to this side (vs. common to both)
 */
function advanceCursor(text: string, options: { cursor: Cursor; isUniqueToSide: boolean; spans: CharSpan[] }): void {
  const { cursor, isUniqueToSide, spans } = options
  let spanStart = isUniqueToSide ? cursor.column : -1
  const pushSpan = () => {
    if (spanStart !== -1 && cursor.column > spanStart) spans.push({ end: cursor.column, line: cursor.line, start: spanStart })
  }
  for (const char of text) {
    if (char === '\n') {
      pushSpan()
      cursor.line += 1
      cursor.column = 0
      spanStart = isUniqueToSide ? 0 : -1
      continue
    }
    cursor.column += 1
  }
  pushSpan()
}

/**
 * Compute, for each side of a modified block, exactly which characters differ from the other
 * side — as per-line `[start, end)` offsets — so the UI can wash just those characters with a
 * brighter background instead of leaving the whole line looking equally "changed"
 * @param text each side's raw text
 * @returns each side's changed-character spans, grouped by line index
 */
export function computeCharDiffSpans(text: BySide<string>): BySide<CharSpan[]> {
  const spans: BySide<CharSpan[]> = { local: [], repo: [] }
  const cursors: BySide<Cursor> = { local: { column: 0, line: 0 }, repo: { column: 0, line: 0 } }
  const advance = (side: Side, value: string, isUniqueToSide: boolean) => advanceCursor(value, { cursor: cursors[side], isUniqueToSide, spans: spans[side] })
  for (const part of diffWordsWithSpace(text.repo, text.local))
    if (part.added) advance('local', part.value, true)
    else if (part.removed) advance('repo', part.value, true)
    else {
      advance('repo', part.value, false)
      advance('local', part.value, false)
    }
  return spans
}

/**
 * Work out which changed-character spans to wash on each side of a modification block. With no
 * pending choice, each side highlights its own characters that differ from the other side. Once a
 * choice is pending, both sides end up displaying the same (winning) text — see
 * `resolveBlockPreview` — so both sides instead highlight whichever original span set belongs to
 * that winning side, so the highlight keeps tracking the actual change instead of vanishing once
 * the two previews become identical
 * @param block the block being resolved
 * @param pending the side currently chosen to win, if any
 * @returns each side's changed-character spans to display
 */
export function resolveDisplaySpans(block: Block, pending: Side | undefined): BySide<CharSpan[]> {
  const spans = computeCharDiffSpans(block.text)
  if (!pending) return spans
  return { local: spans[pending], repo: spans[pending] }
}
