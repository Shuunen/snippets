import { diffLines } from 'diff'
import { invariant, isNil } from 'es-toolkit'
import type { NamedAction } from './merge.options'

export type Block = {
  /** raw text on the backup/destination side (empty if the block only exists on the live side) */ destText: string
  /** raw text on the live/source side (empty if the block only exists on the backup side) */ sourceText: string
  /** block kind */ type: 'common' | 'conflict'
}

export type Side = 'dest' | 'source'

/**
 * Turn two file contents into a list of common and conflicting blocks
 * @param destContent the backup (destination) file content
 * @param sourceContent the live (source) file content
 * @returns the ordered list of blocks
 */
export function computeBlocks(destContent: string, sourceContent: string): Block[] {
  const changes = diffLines(destContent, sourceContent)
  const blocks: Block[] = []
  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index]
    if (!change) continue
    if (!change.added && !change.removed) {
      blocks.push({ destText: change.value, sourceText: change.value, type: 'common' })
      continue
    }
    if (change.removed) {
      const next = changes[index + 1]
      const hasPairedAddition = next?.added ?? false
      blocks.push({ destText: change.value, sourceText: hasPairedAddition ? next.value : '', type: 'conflict' })
      if (hasPairedAddition) index += 1
      continue
    }
    // an "added" block not paired with a preceding "removed" one : only on the live side
    blocks.push({ destText: '', sourceText: change.value, type: 'conflict' })
  }
  return blocks
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
 * Hard-wrap a list of lines to a fixed width, so none of them ever overflow a terminal column
 * and trigger the terminal's own line-wrapping (which misaligns a side-by-side layout)
 * @param lines the lines to wrap
 * @param width the max visible width of a wrapped chunk
 * @returns the wrapped lines, each at most `width` characters long
 */
export function wrapLines(lines: string[], width: number): string[] {
  if (width <= 0) return lines
  return lines.flatMap(line => {
    if (line.length <= width) return [line]
    const chunks: string[] = []
    for (let start = 0; start < line.length; start += width) chunks.push(line.slice(start, start + width))
    return chunks
  })
}

/**
 * Truncate a plain-text line to a width, marking the cut with an ellipsis, for a non-wrapping display mode
 * @param text the line to truncate
 * @param width the max visible width
 * @param ellipsis the marker appended at the cut
 * @returns the truncated line
 */
export function truncateLine(text: string, width: number, ellipsis = '…'): string {
  if (text.length <= width || width <= 0) return text.slice(0, Math.max(0, width))
  return `${text.slice(0, Math.max(0, width - ellipsis.length))}${ellipsis}`
}

/**
 * Apply the user choices to the blocks and produce the final merged content
 * @param blocks the blocks, in order
 * @param choices one choice per conflicting block, in order
 * @returns the merged content, ready to be written to both files
 */
export function applyChoices(blocks: Block[], choices: Side[]): string {
  let choiceIndex = 0
  let output = ''
  for (const block of blocks) {
    if (block.type === 'common') {
      output += block.destText
      continue
    }
    const choice = choices[choiceIndex] ?? 'dest'
    choiceIndex += 1
    output += choice === 'dest' ? block.destText : block.sourceText
  }
  return output
}

export type BlockChangeKind = 'addition' | 'modification' | 'removal'

/**
 * Work out what a pending choice would actually do to the side it overwrites : gain content that
 * side didn't have (addition), lose content it did have (removal), or replace one line with
 * another (modification). Unlike `classifyBlockChange`, this looks at the side that will actually
 * change once the choice is confirmed, not a fixed dest/source convention
 * @param block the block being resolved
 * @param pending the side currently chosen to win
 * @returns the resulting change kind
 */
export function resolvePendingKind(block: Block, pending: Side): BlockChangeKind {
  const overwritten: Side = pending === 'dest' ? 'source' : 'dest'
  const before = overwritten === 'dest' ? block.destText : block.sourceText
  const after = pending === 'dest' ? block.destText : block.sourceText
  if (before === '' && after !== '') return 'addition'
  if (after === '') return 'removal'
  return 'modification'
}

export type BlockPreview = { destDeleted: boolean; destText: string; sourceDeleted: boolean; sourceText: string }

/**
 * Resolve what each side should display given a pending choice. With no pending choice, each side
 * just shows its own text. Once a choice is pending, the side that would be overwritten previews
 * the incoming content instead of its own — unless that overwrite would delete its content
 * outright (rather than replace it with something else), in which case its original text is kept
 * and flagged as deleted, so it can be struck through instead of just vanishing.
 * @param block the block being resolved
 * @param pending the side currently chosen to win, if any
 * @returns each side's text to display, and whether it's flagged as about to be deleted
 */
export function resolveBlockPreview(block: Block, pending: Side | undefined): BlockPreview {
  if (!pending) return { destDeleted: false, destText: block.destText, sourceDeleted: false, sourceText: block.sourceText }
  const overwritten: Side = pending === 'dest' ? 'source' : 'dest'
  const isDeletion = resolvePendingKind(block, pending) === 'removal'
  const destDeleted = isDeletion && overwritten === 'dest'
  const sourceDeleted = isDeletion && overwritten === 'source'
  const destIncomingText = pending === 'source' ? block.sourceText : block.destText
  const sourceIncomingText = pending === 'dest' ? block.destText : block.sourceText
  return {
    destDeleted,
    destText: destDeleted ? block.destText : destIncomingText,
    sourceDeleted,
    sourceText: sourceDeleted ? block.sourceText : sourceIncomingText,
  }
}

/**
 * Classify what kind of change a conflicting block represents : purely added on the live side,
 * purely removed from the live side, or a line that exists on both sides but changed
 * @param block the conflicting block to classify
 * @returns the change kind
 */
export function classifyBlockChange(block: Block): BlockChangeKind {
  if (block.destText === '') return 'addition'
  if (block.sourceText === '') return 'removal'
  return 'modification'
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

export type BlockAction = 'abort' | 'confirm' | 'down' | 'external' | 'select-dest' | 'select-source' | 'skip-file' | 'toggle-wrap' | 'up'

export type ParsedKey = { ctrl?: boolean; name?: string }

/**
 * Turn a raw keypress into the action it means, while resolving a conflicting block
 * @param key the parsed key
 * @param pending the side currently highlighted, if any
 * @returns the action, or undefined if the key means nothing here
 */
export function classifyBlockKey(key: ParsedKey, pending: Side | undefined): BlockAction | undefined {
  if (!key.name) return undefined
  if (key.name === 'left') return 'select-source'
  if (key.name === 'right') return 'select-dest'
  if (key.name === 'up') return 'up'
  if (key.name === 'down') return 'down'
  if (key.name === 'return' && pending) return 'confirm'
  if (key.name === 'e') return 'external'
  if (key.name === 'w') return 'toggle-wrap'
  if (key.name === 's') return 'skip-file'
  if (key.name === 'a' || key.name === 'q' || (key.ctrl && key.name === 'c')) return 'abort'
  return undefined
}

export type BlockNavState = {
  choices: (Side | undefined)[]
  currentIndex: number
  pending: Side | undefined
}

export type BlockNavStep = BlockNavState & { done?: false }

export type BlockNavDone = { choices: Side[]; done: true }

/**
 * Move the cursor to a given block index, restoring that block's already-confirmed choice (if any) as pending
 * @param state the current navigation state
 * @param index the block index to move to
 * @returns the updated state
 */
function moveTo(state: BlockNavState, index: number): BlockNavState {
  return { ...state, currentIndex: index, pending: state.choices[index] }
}

/**
 * Find the next block (wrapping around) that has no confirmed choice yet
 * @param choices the choices made so far
 * @param fromIndex the index to search forward from
 * @returns the next unresolved index, or -1 if every block is resolved
 */
function findNextUnresolved(choices: (Side | undefined)[], fromIndex: number): number {
  for (let offset = 1; offset <= choices.length; offset += 1) {
    const index = (fromIndex + offset) % choices.length
    if (choices[index] === undefined) return index
  }
  return -1
}

/**
 * Record a selection for the current block immediately, so it survives navigating away and back
 * even if Enter is never pressed on it
 * @param state the current state
 * @param value the chosen side
 * @returns the updated state
 */
function select(state: BlockNavState, value: Side): BlockNavStep {
  const choices = [...state.choices]
  choices[state.currentIndex] = value
  return { ...state, choices, pending: value }
}

/**
 * Apply one navigation/selection/confirmation action to the block-resolution state. Selecting a
 * side (left/right) commits it right away ; confirming (Enter) only moves on to the next
 * unresolved block, or reports done once every block has a selection.
 * @param state the current state
 * @param action the action to apply
 * @param blockCount the total number of conflicting blocks in the file
 * @returns the next state, or the final choices once every block is resolved
 */
export function stepBlockState(state: BlockNavState, action: 'confirm' | 'down' | 'select-dest' | 'select-source' | 'up', blockCount: number): BlockNavDone | BlockNavStep {
  if (action === 'select-source') return select(state, 'source')
  if (action === 'select-dest') return select(state, 'dest')
  if (action === 'up') return moveTo(state, Math.max(0, state.currentIndex - 1))
  if (action === 'down') return moveTo(state, Math.min(blockCount - 1, state.currentIndex + 1))
  if (action === 'confirm' && state.pending) {
    const nextIndex = findNextUnresolved(state.choices, state.currentIndex)
    if (nextIndex === -1) {
      const choices = state.choices.filter(choice => !isNil(choice))
      invariant(choices.length === state.choices.length, 'every block should have a choice once none is left unresolved')
      return { choices, done: true }
    }
    return moveTo(state, nextIndex)
  }
  return state
}

/**
 * Whether a side will be overwritten in this session : either it's the pending choice for the
 * block currently being viewed, or it's already been confirmed for some other block
 * @param state the current navigation state
 * @param side the winning side to check for
 * @returns true if that side would overwrite the other
 */
export function wouldOverwrite(state: BlockNavState, side: Side): boolean {
  return state.pending === side || state.choices.includes(side)
}

/**
 * Find the action matching a raw keypress among a fixed list of named actions (a `key` may list several alternatives separated by `/`, e.g. `'a/q'`)
 * @param actions the available actions
 * @param key the parsed key
 * @returns the matched action's name, or undefined
 */
export function matchAction(actions: NamedAction[], key: ParsedKey): string | undefined {
  return actions.find(action => action.key.split('/').includes(key.name ?? ''))?.name
}
