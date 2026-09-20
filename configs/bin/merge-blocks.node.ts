import { diffLines, type Change } from 'diff'
import { invariant } from 'es-toolkit'
import { buildSectionLookup, computeNoiseCutoffs, computeRuns, isNoiseLine, splitKeepingNewlines, type NoiseCutoffs } from './merge-noise.node'

export type Block = {
  /** raw text on the backup/destination side (empty if the block only exists on the live side) */ destText: string
  /** true if every line on both sides is ignorable (blank, past a removeLinesAfter cutoff, or matching a removeLinesMatching pattern) : auto-resolved, never shown to the user */ isNoise?: boolean
  /** raw text on the live/source side (empty if the block only exists on the backup side) */ sourceText: string
  /** block kind */ type: 'common' | 'conflict'
}

export type Side = 'dest' | 'source'

type Cursor = { destLine: number; sourceLine: number }

/**
 * Split a one-sided (pure addition or pure removal) diff chunk into one block per contiguous run
 * of same-noise-status lines, so a noise line sitting next to a real one doesn't hide it
 * @param text the chunk's raw text, only present on one side
 * @param startLine that side's line index where this text begins
 * @param cutoffIndex that side's removeLinesAfter cutoff line index, or -1 if none
 * @param removeLinesMatching a list of regex matching lines to ignore
 * @param side which side this text is on
 * @returns the resulting blocks, in order
 */
// oxlint-disable-next-line max-params
function buildOneSidedBlocks(text: string, startLine: number, cutoffIndex: number, removeLinesMatching: RegExp[] | undefined, side: Side): Block[] {
  const lines = splitKeepingNewlines(text)
  const lineAt = (index: number): string => {
    const line = lines[index]
    invariant(line !== undefined, 'line should be defined, index is within lines.length bounds')
    return line
  }
  const runs = computeRuns(lines.length, index => isNoiseLine({ cutoffIndex, line: lineAt(index), lineIndex: startLine + index, removeLinesMatching }))
  return runs.map(run => {
    const runText = lines.slice(run.start, run.start + run.length).join('')
    return side === 'dest' ? { destText: runText, isNoise: run.isNoise, sourceText: '', type: 'conflict' } : { destText: '', isNoise: run.isNoise, sourceText: runText, type: 'conflict' }
  })
}

type NoiseWholeSideOptions = { cutoffIndex: number; lines: string[]; removeLinesMatching: RegExp[] | undefined; startLine: number }

/**
 * Whether every line of a side's text is noise, given where it starts
 * @param options the side's lines and their position/filters
 * @returns true if every line is noise (vacuously true when there are no lines)
 */
function isNoiseWholeSide(options: NoiseWholeSideOptions): boolean {
  const { cutoffIndex, lines, removeLinesMatching, startLine } = options
  return lines.every((line, index) => isNoiseLine({ cutoffIndex, line, lineIndex: startLine + index, removeLinesMatching }))
}

/**
 * Split a removed+added (modification) diff chunk pair into blocks. When both sides have the same
 * number of lines, each line pair is checked independently and grouped into runs, so a noise line
 * pair doesn't force a real change next to it into the same block. Otherwise (line counts differ,
 * so there's no clean line-by-line correspondence) the whole pair stays one block
 * @param destText the removed text on the backup side
 * @param sourceText the added text on the live side
 * @param cursor the running per-side line counters
 * @param cutoffs each side's removeLinesAfter cutoff line index
 * @param removeLinesMatching a list of regex matching lines to ignore
 * @returns the resulting blocks, in order
 */
// oxlint-disable-next-line max-params
function buildModificationBlocks(destText: string, sourceText: string, cursor: Cursor, cutoffs: NoiseCutoffs, removeLinesMatching: RegExp[] | undefined): Block[] {
  const destLines = splitKeepingNewlines(destText)
  const sourceLines = splitKeepingNewlines(sourceText)
  const destStart = cursor.destLine
  const sourceStart = cursor.sourceLine
  if (destLines.length !== sourceLines.length) {
    const isNoise =
      isNoiseWholeSide({ cutoffIndex: cutoffs.destCutoff, lines: destLines, removeLinesMatching, startLine: destStart }) &&
      isNoiseWholeSide({ cutoffIndex: cutoffs.sourceCutoff, lines: sourceLines, removeLinesMatching, startLine: sourceStart })
    return [{ destText, isNoise, sourceText, type: 'conflict' }]
  }
  const destLineAt = (index: number): string => {
    const line = destLines[index]
    invariant(line !== undefined, 'destLine should be defined, index is within destLines.length bounds')
    return line
  }
  const sourceLineAt = (index: number): string => {
    const line = sourceLines[index]
    invariant(line !== undefined, 'sourceLine should be defined, destLines and sourceLines have equal length here')
    return line
  }
  const runs = computeRuns(destLines.length, index => {
    const destLine = destLineAt(index)
    const sourceLine = sourceLineAt(index)
    // a line differing from its pair only by trailing whitespace (typically a missing/extra final newline)
    // shows no visible change on screen, so treat it as noise the same as a fully ignorable line
    if (destLine.trimEnd() === sourceLine.trimEnd()) return true
    return (
      isNoiseLine({ cutoffIndex: cutoffs.destCutoff, line: destLine, lineIndex: destStart + index, removeLinesMatching }) &&
      isNoiseLine({ cutoffIndex: cutoffs.sourceCutoff, line: sourceLine, lineIndex: sourceStart + index, removeLinesMatching })
    )
  })
  return runs.map(run => ({
    destText: destLines.slice(run.start, run.start + run.length).join(''),
    isNoise: run.isNoise,
    sourceText: sourceLines.slice(run.start, run.start + run.length).join(''),
    type: 'conflict',
  }))
}

type BuildContext = {
  blocks: Block[]
  cursor: Cursor
  cutoffs: NoiseCutoffs
  destSections: string[]
  removeBlocksMatching: RegExp[] | undefined
  removeLinesMatching: RegExp[] | undefined
  sourceSections: string[]
}

/**
 * Push a common (unchanged) block and advance both sides' line counters by its length
 * @param change the unchanged diff change
 * @param context the shared block-building state, mutated in place
 */
function pushCommonBlock(change: Change, context: BuildContext): void {
  const { blocks, cursor } = context
  const lineCount = splitKeepingNewlines(change.value).length
  blocks.push({ destText: change.value, sourceText: change.value, type: 'common' })
  cursor.destLine += lineCount
  cursor.sourceLine += lineCount
}

/**
 * Whether a change falls under a section (on either side) matching one of the whole-block
 * exclusion patterns. Checked against the enclosing `[Header]`, not the change's own text, so a
 * change to a setting inside an existing, untouched section still gets excluded
 * @param context the shared block-building state
 * @returns true if either side's current section matches
 */
function matchesRemoveBlocks(context: BuildContext): boolean {
  const { cursor, destSections, removeBlocksMatching, sourceSections } = context
  if (!removeBlocksMatching) return false
  const destSection = destSections[cursor.destLine]
  invariant(destSection !== undefined, 'destSection should be defined, cursor.destLine stays within destSections bounds')
  const sourceSection = sourceSections[cursor.sourceLine]
  invariant(sourceSection !== undefined, 'sourceSection should be defined, cursor.sourceLine stays within sourceSections bounds')
  return removeBlocksMatching.some(regex => regex.test(destSection) || regex.test(sourceSection))
}

/**
 * Push the blocks for a removed+added (modification) pair and advance both sides' line counters.
 * A pair whose enclosing section matches removeBlocksMatching is kept as a single noise block instead of being split
 * @param change the removed diff change
 * @param next the paired added diff change
 * @param context the shared block-building state, mutated in place
 */
function pushModificationBlocks(change: Change, next: Change, context: BuildContext): void {
  const { blocks, cursor, cutoffs, removeLinesMatching } = context
  if (matchesRemoveBlocks(context)) blocks.push({ destText: change.value, isNoise: true, sourceText: next.value, type: 'conflict' })
  else blocks.push(...buildModificationBlocks(change.value, next.value, cursor, cutoffs, removeLinesMatching))
  cursor.destLine += splitKeepingNewlines(change.value).length
  cursor.sourceLine += splitKeepingNewlines(next.value).length
}

/**
 * Push the blocks for a one-sided (pure addition or removal) diff change and advance that side's
 * line counter. A change whose enclosing section matches removeBlocksMatching is kept as a single noise block instead of being split
 * @param change the removed or added diff change
 * @param side which side this change is on
 * @param context the shared block-building state, mutated in place
 */
function pushOneSidedBlock(change: Change, side: Side, context: BuildContext): void {
  const { blocks, cursor, cutoffs, removeLinesMatching } = context
  if (matchesRemoveBlocks(context)) blocks.push(side === 'dest' ? { destText: change.value, isNoise: true, sourceText: '', type: 'conflict' } : { destText: '', isNoise: true, sourceText: change.value, type: 'conflict' })
  else {
    const startLine = side === 'dest' ? cursor.destLine : cursor.sourceLine
    const cutoffIndex = side === 'dest' ? cutoffs.destCutoff : cutoffs.sourceCutoff
    blocks.push(...buildOneSidedBlocks(change.value, startLine, cutoffIndex, removeLinesMatching, side))
  }
  const lineCount = splitKeepingNewlines(change.value).length
  if (side === 'dest') cursor.destLine += lineCount
  else cursor.sourceLine += lineCount
}

/**
 * Turn two file contents into a list of common and conflicting blocks. removeBlocksMatching is
 * checked first, against the INI-style `[Header]` section each change falls under (on either
 * side) — not just the change's own text — so a change to a setting inside an existing, untouched
 * section still gets excluded ; a match is kept as a single noise block instead of being split.
 * Otherwise, when removeLinesAfter and/or removeLinesMatching are given (mirroring a config's own
 * noise filters), a conflicting block gets flagged `isNoise` once every line on both sides is
 * ignorable by them, so it can be auto-resolved instead of asked about — checked line by line, so
 * a single noise line inside an otherwise real change gets carved out into its own block
 * @param destContent the backup (destination) file content
 * @param sourceContent the live (source) file content
 * @param removeLinesAfter a regex marking the point after which lines are ignored
 * @param removeLinesMatching a list of regex matching lines to ignore
 * @param removeBlocksMatching a list of regex matching an enclosing `[Header]` section to exclude it wholesale
 * @returns the ordered list of blocks
 */
// oxlint-disable-next-line max-params
export function computeBlocks(destContent: string, sourceContent: string, removeLinesAfter?: RegExp, removeLinesMatching?: RegExp[], removeBlocksMatching?: RegExp[]): Block[] {
  const changes = diffLines(destContent, sourceContent)
  const cutoffs = computeNoiseCutoffs(destContent, sourceContent, removeLinesAfter)
  const context: BuildContext = {
    blocks: [],
    cursor: { destLine: 0, sourceLine: 0 },
    cutoffs,
    destSections: buildSectionLookup(destContent),
    removeBlocksMatching,
    removeLinesMatching,
    sourceSections: buildSectionLookup(sourceContent),
  }
  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index]
    invariant(change, 'change should be defined, index is within changes.length bounds')
    if (!change.added && !change.removed) {
      pushCommonBlock(change, context)
      continue
    }
    const next = changes[index + 1]
    if (change.removed && next?.added) {
      pushModificationBlocks(change, next, context)
      index += 1
      continue
    }
    pushOneSidedBlock(change, change.removed ? 'dest' : 'source', context)
  }
  return context.blocks
}

/**
 * Split a block's raw text into display lines, dropping the trailing empty line the diff library adds
 * @param text the raw block text
 * @returns the display lines
 */
export function linesOf(text: string): string[] {
  return text.split('\n').filter((line, index, lines) => index < lines.length - 1 || line !== '')
}

export type MergedOutput = { destOutput: string; sourceOutput: string }

/**
 * Apply the user choices to the blocks and produce each side's final content. Common blocks are
 * identical on both sides already ; noise blocks are left untouched, each side keeping its own
 * ignorable text (a stale backup timestamp shouldn't overwrite the live one, or vice versa) ;
 * only genuinely resolved conflicts write the chosen text to both sides
 * @param blocks the blocks, in order
 * @param choices one choice per non-noise conflicting block, in order
 * @returns the merged content for each side, ready to be written to its own file
 */
export function applyChoices(blocks: Block[], choices: Side[]): MergedOutput {
  let choiceIndex = 0
  let destOutput = ''
  let sourceOutput = ''
  for (const block of blocks) {
    if (block.type === 'common' || block.isNoise) {
      destOutput += block.destText
      sourceOutput += block.sourceText
      continue
    }
    const choice = choices[choiceIndex] ?? 'dest'
    choiceIndex += 1
    const chosenText = choice === 'dest' ? block.destText : block.sourceText
    destOutput += chosenText
    sourceOutput += chosenText
  }
  return { destOutput, sourceOutput }
}
