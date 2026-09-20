import { diffLines, type Change } from 'diff'
import { type BySide, type NoiseFilters, type Side, sides } from '../types'
import { at } from '../utils'
import { buildSectionLookup, computeNoiseCutoffs, computeRuns, isNoiseLine, isNoiseWholeSide, joinRun, type NoiseCutoffs, splitKeepingNewlines } from './noise'

export type Block = {
  /** true if every line on both sides is ignorable (blank, past a removeLinesAfter cutoff, or matching a removeLinesMatching pattern) : auto-resolved, never shown to the user */ isNoise?: boolean
  /** each side's raw text (empty on a side the block doesn't exist on) */ text: BySide<string>
  /** block kind */ type: 'common' | 'conflict'
}

/**
 * Build a block's per-side text for content that only exists on one side
 * @param side the side the text is on
 * @param text the raw text
 * @returns the text for both sides, the other one empty
 */
function textOnSide(side: Side, text: string): BySide<string> {
  return side === 'repo' ? { local: '', repo: text } : { local: text, repo: '' }
}

type OneSidedOptions = { cutoffIndex: number; filters: NoiseFilters; side: Side; startLine: number; text: string }

/**
 * Split a one-sided (pure addition or pure removal) diff chunk into one block per contiguous run
 * of same-noise-status lines, so a noise line sitting next to a real one doesn't hide it
 * @param options the chunk's text, the side it's on, and where it starts among that side's lines
 * @returns the resulting blocks, in order
 */
function buildOneSidedBlocks(options: OneSidedOptions): Block[] {
  const { cutoffIndex, filters, side, startLine, text } = options
  const lines = splitKeepingNewlines(text)
  const runs = computeRuns(lines.length, index => isNoiseLine({ cutoffIndex, filters, line: at(lines, index), lineIndex: startLine + index }))
  return runs.map(run => ({ isNoise: run.isNoise, text: textOnSide(side, joinRun(lines, run)), type: 'conflict' }))
}

type ModificationOptions = { cutoffs: NoiseCutoffs; filters: NoiseFilters; startLines: BySide<number>; text: BySide<string> }

/**
 * Split a removed+added (modification) diff chunk pair into blocks. When both sides have the same
 * number of lines, each line pair is checked independently and grouped into runs, so a noise line
 * pair doesn't force a real change next to it into the same block. Otherwise (line counts differ,
 * so there's no clean line-by-line correspondence) the whole pair stays one block
 * @param options each side's text, where it starts, and the noise filters to judge it by
 * @returns the resulting blocks, in order
 */
function buildModificationBlocks(options: ModificationOptions): Block[] {
  const { cutoffs, filters, startLines, text } = options
  const lines: BySide<string[]> = { local: splitKeepingNewlines(text.local), repo: splitKeepingNewlines(text.repo) }
  if (lines.local.length !== lines.repo.length) {
    const isNoise = sides.every(side => isNoiseWholeSide({ cutoffIndex: cutoffs[side], filters, lines: lines[side], startLine: startLines[side] }))
    return [{ isNoise, text, type: 'conflict' }]
  }
  const runs = computeRuns(lines.repo.length, index => {
    const pair: BySide<string> = { local: at(lines.local, index), repo: at(lines.repo, index) }
    // a line differing from its pair only by trailing whitespace (typically a missing/extra final newline)
    // shows no visible change on screen, so treat it as noise the same as a fully ignorable line
    if (pair.local.trimEnd() === pair.repo.trimEnd()) return true
    return sides.every(side => isNoiseLine({ cutoffIndex: cutoffs[side], filters, line: pair[side], lineIndex: startLines[side] + index }))
  })
  return runs.map(run => ({ isNoise: run.isNoise, text: { local: joinRun(lines.local, run), repo: joinRun(lines.repo, run) }, type: 'conflict' }))
}

type BuildContext = {
  blocks: Block[]
  /** how far into each side's lines the walk has got */ cursor: BySide<number>
  cutoffs: NoiseCutoffs
  filters: NoiseFilters
  /** each side's per-line enclosing `[Header]` section */ sections: BySide<string[]>
}

/**
 * Push a common (unchanged) block and advance both sides' line counters by its length
 * @param change the unchanged diff change
 * @param context the shared block-building state, mutated in place
 */
function pushCommonBlock(change: Change, context: BuildContext): void {
  const lineCount = splitKeepingNewlines(change.value).length
  context.blocks.push({ text: { local: change.value, repo: change.value }, type: 'common' })
  for (const side of sides) context.cursor[side] += lineCount
}

/**
 * Whether a change falls under a section (on either side) matching one of the whole-block
 * exclusion patterns. Checked against the enclosing `[Header]`, not the change's own text, so a
 * change to a setting inside an existing, untouched section still gets excluded
 * @param context the shared block-building state
 * @returns true if either side's current section matches
 */
function matchesRemoveBlocks(context: BuildContext): boolean {
  const { cursor, filters, sections } = context
  const patterns = filters.removeBlocksMatching
  if (!patterns) return false
  return sides.some(side => patterns.some(regex => regex.test(at(sections[side], cursor[side]))))
}

/**
 * Push the blocks for a removed+added (modification) pair and advance both sides' line counters.
 * A pair whose enclosing section matches removeBlocksMatching is kept as a single noise block instead of being split
 * @param removed the removed diff change, on the repo side
 * @param added the paired added diff change, on the local side
 * @param context the shared block-building state, mutated in place
 */
function pushModificationBlocks(removed: Change, added: Change, context: BuildContext): void {
  const { blocks, cursor, cutoffs, filters } = context
  const text: BySide<string> = { local: added.value, repo: removed.value }
  if (matchesRemoveBlocks(context)) blocks.push({ isNoise: true, text, type: 'conflict' })
  else blocks.push(...buildModificationBlocks({ cutoffs, filters, startLines: { ...cursor }, text }))
  for (const side of sides) cursor[side] += splitKeepingNewlines(text[side]).length
}

/**
 * Push the blocks for a one-sided (pure addition or removal) diff change and advance that side's
 * line counter. A change whose enclosing section matches removeBlocksMatching is kept as a single noise block instead of being split
 * @param change the removed or added diff change
 * @param side which side this change is on
 * @param context the shared block-building state, mutated in place
 */
function pushOneSidedBlock(change: Change, side: Side, context: BuildContext): void {
  const { blocks, cursor, cutoffs, filters } = context
  if (matchesRemoveBlocks(context)) blocks.push({ isNoise: true, text: textOnSide(side, change.value), type: 'conflict' })
  else blocks.push(...buildOneSidedBlocks({ cutoffIndex: cutoffs[side], filters, side, startLine: cursor[side], text: change.value }))
  cursor[side] += splitKeepingNewlines(change.value).length
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
 * @param contents each side's file content
 * @param filters the noise filters to judge changes by
 * @returns the ordered list of blocks
 */
export function computeBlocks(contents: BySide<string>, filters: NoiseFilters = {}): Block[] {
  const context: BuildContext = {
    blocks: [],
    cursor: { local: 0, repo: 0 },
    cutoffs: computeNoiseCutoffs(contents, filters.removeLinesAfter),
    filters,
    sections: { local: buildSectionLookup(contents.local), repo: buildSectionLookup(contents.repo) },
  }
  const changes = diffLines(contents.repo, contents.local)
  for (let index = 0; index < changes.length; index += 1) {
    const change = at(changes, index)
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
    pushOneSidedBlock(change, change.removed ? 'repo' : 'local', context)
  }
  return context.blocks
}

/**
 * The blocks a user actually has to decide on : conflicts that noise filters couldn't auto-resolve
 * @param blocks the full ordered list of blocks
 * @returns the conflicting, non-noise blocks, in order
 */
export function conflictsOf(blocks: Block[]): Block[] {
  return blocks.filter(block => block.type === 'conflict' && !block.isNoise)
}

/**
 * Split a block's raw text into display lines, dropping the trailing empty line the diff library adds
 * @param text the raw block text
 * @returns the display lines
 */
export function linesOf(text: string): string[] {
  return text.split('\n').filter((line, index, lines) => index < lines.length - 1 || line !== '')
}

/**
 * Apply the user choices to the blocks and produce each side's final content. Common blocks are
 * identical on both sides already ; noise blocks are left untouched, each side keeping its own
 * ignorable text (a stale backup timestamp shouldn't overwrite the live one, or vice versa) ;
 * only genuinely resolved conflicts write the chosen text to both sides
 * @param blocks the blocks, in order
 * @param choices one choice per non-noise conflicting block, in order
 * @returns the merged content for each side, ready to be written to its own file
 */
export function applyChoices(blocks: Block[], choices: Side[]): BySide<string> {
  let choiceIndex = 0
  const output: BySide<string> = { local: '', repo: '' }
  for (const block of blocks) {
    if (block.type === 'common' || block.isNoise) {
      for (const side of sides) output[side] += block.text[side]
      continue
    }
    const choice = choices[choiceIndex] ?? 'repo'
    choiceIndex += 1
    for (const side of sides) output[side] += block.text[choice]
  }
  return output
}
