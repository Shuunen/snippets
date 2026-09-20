import { diffWordsWithSpace } from 'diff'
import type { Block, Side } from './merge-blocks.node'

export type CharSpan = { end: number; line: number; start: number }

/**
 * Walk one diff chunk's text, splitting it on line breaks and, while inside a chunk that's unique
 * to one side, recording a `[start, end)` span (in that line's own character offsets) for each
 * line it touches, so the caller can wash exactly those characters instead of a whole line
 * @param text the diff chunk's raw text
 * @param options the span list to append to (mutated in place), the current line/column position
 * on this side (mutated in place), and whether this chunk is unique to this side (vs. common to both)
 */
function advanceCursor(text: string, options: { cursor: { column: number; line: number }; isUniqueToSide: boolean; spans: CharSpan[] }): void {
  const { cursor, isUniqueToSide, spans } = options
  let spanStart = isUniqueToSide ? cursor.column : -1
  for (const char of text) {
    if (char === '\n') {
      if (spanStart !== -1 && cursor.column > spanStart) spans.push({ end: cursor.column, line: cursor.line, start: spanStart })
      cursor.line += 1
      cursor.column = 0
      spanStart = isUniqueToSide ? 0 : -1
      continue
    }
    cursor.column += 1
  }
  if (spanStart !== -1 && cursor.column > spanStart) spans.push({ end: cursor.column, line: cursor.line, start: spanStart })
}

/**
 * Compute, for each side of a modified block, exactly which characters differ from the other
 * side — as per-line `[start, end)` offsets — so the UI can wash just those characters with a
 * brighter background instead of leaving the whole line looking equally "changed"
 * @param destText the destination side's text
 * @param sourceText the source side's text
 * @returns each side's changed-character spans, grouped by line index
 */
export function computeCharDiffSpans(destText: string, sourceText: string): { destSpans: CharSpan[]; sourceSpans: CharSpan[] } {
  const destSpans: CharSpan[] = []
  const sourceSpans: CharSpan[] = []
  const destCursor = { column: 0, line: 0 }
  const sourceCursor = { column: 0, line: 0 }
  for (const part of diffWordsWithSpace(destText, sourceText))
    if (part.added) advanceCursor(part.value, { cursor: sourceCursor, isUniqueToSide: true, spans: sourceSpans })
    else if (part.removed) advanceCursor(part.value, { cursor: destCursor, isUniqueToSide: true, spans: destSpans })
    else {
      advanceCursor(part.value, { cursor: destCursor, isUniqueToSide: false, spans: destSpans })
      advanceCursor(part.value, { cursor: sourceCursor, isUniqueToSide: false, spans: sourceSpans })
    }
  return { destSpans, sourceSpans }
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
export function resolveDisplaySpans(block: Block, pending: Side | undefined): { destSpans: CharSpan[]; sourceSpans: CharSpan[] } {
  const { destSpans, sourceSpans } = computeCharDiffSpans(block.destText, block.sourceText)
  if (!pending) return { destSpans, sourceSpans }
  const winningSpans = pending === 'dest' ? destSpans : sourceSpans
  return { destSpans: winningSpans, sourceSpans: winningSpans }
}
