import { invariant, isNil } from 'es-toolkit'
import type { BySide, Side } from '../types'
import { type Block, linesOf } from './blocks'
import type { NamedAction } from './options'

/**
 * The side a choice overwrites : the one that didn't win
 * @param side the winning side
 * @returns the other side
 */
export function otherSide(side: Side): Side {
  return side === 'repo' ? 'local' : 'repo'
}

export type BlockChangeKind = 'addition' | 'modification' | 'removal'

/**
 * Classify what kind of change a conflicting block represents : purely added on the live side,
 * purely removed from the live side, or a line that exists on both sides but changed
 * @param block the conflicting block to classify
 * @returns the change kind
 */
export function classifyBlockChange(block: Block): BlockChangeKind {
  if (block.text.repo === '') return 'addition'
  if (block.text.local === '') return 'removal'
  return 'modification'
}

/**
 * Work out what a pending choice would actually do to the side it overwrites : gain content that
 * side didn't have (addition), lose content it did have (removal), or replace one line with
 * another (modification). Unlike `classifyBlockChange`, this looks at the side that will actually
 * change once the choice is confirmed, not a fixed repo/local convention
 * @param block the block being resolved
 * @param pending the side currently chosen to win
 * @returns the resulting change kind
 */
export function resolvePendingKind(block: Block, pending: Side): BlockChangeKind {
  const before = block.text[otherSide(pending)]
  const after = block.text[pending]
  if (before === '' && after !== '') return 'addition'
  if (after === '') return 'removal'
  return 'modification'
}

/**
 * The change kind to show for a block : what the pending choice would do, or what the block is, while nothing is chosen
 * @param block the block being resolved
 * @param pending the side currently chosen to win, if any
 * @returns the change kind
 */
export function resolveDisplayKind(block: Block, pending: Side | undefined): BlockChangeKind {
  return pending ? resolvePendingKind(block, pending) : classifyBlockChange(block)
}

export type PreviewLine = {
  /** true if confirming the pending choice would drop this line, so it should be struck through rather than just vanish */ isDeleted: boolean
  text: string
}

/**
 * Mark a line as surviving the pending choice
 * @param text the line's text
 * @returns the preview line
 */
function kept(text: string): PreviewLine {
  return { isDeleted: false, text }
}

/**
 * Mark a line as about to be dropped by the pending choice
 * @param text the line's text
 * @returns the preview line
 */
function dropped(text: string): PreviewLine {
  return { isDeleted: true, text }
}

/**
 * Resolve the lines each side should display given a pending choice. With no pending choice, each
 * side just shows its own lines. Once a choice is pending, the winning side keeps its lines and the
 * overwritten side previews them instead of its own — but a side losing more lines than it gains
 * keeps the surplus on screen, flagged as deleted, so they can be struck through instead of
 * silently vanishing. That covers both a side wiped out entirely and a modification that simply
 * shrinks it, e.g. two lines replaced by one.
 * @param block the block being resolved
 * @param pending the side currently chosen to win, if any
 * @returns each side's lines to display, each flagged as kept or deleted
 */
export function resolveBlockPreview(block: Block, pending: Side | undefined): BySide<PreviewLine[]> {
  const lines: BySide<string[]> = { local: linesOf(block.text.local), repo: linesOf(block.text.repo) }
  if (!pending) return { local: lines.local.map(line => kept(line)), repo: lines.repo.map(line => kept(line)) }
  const winning = lines[pending].map(line => kept(line))
  const surplus = lines[otherSide(pending)].slice(winning.length).map(line => dropped(line))
  const overwritten = [...winning, ...surplus]
  return pending === 'repo' ? { local: overwritten, repo: winning } : { local: winning, repo: overwritten }
}

/**
 * Compare one row's before/after text to say what happens to it
 * @param before the text that row holds today, if any
 * @param after the text it ends up with, if any
 * @returns the change kind, or undefined when the row is unaffected
 */
function compareRow(before: string | undefined, after: string | undefined): BlockChangeKind | undefined {
  // there are only as many rows as the longer side has lines, so they are never both undefined
  if (before === undefined) return 'addition'
  if (after === undefined) return 'removal'
  return before === after ? undefined : 'modification'
}

/**
 * Work out what happens at each row of a block, rather than judging the block as a whole : a
 * modification that swaps one line and drops another is a yellow row followed by a red one, not two
 * yellow rows. With nothing chosen yet, each row is judged against the backup, so it reports what
 * the live file did to it. Once a choice is pending, each row is judged against what the overwritten
 * side is about to become, so it reports what confirming would do to it.
 * @param block the block being resolved
 * @param pending the side currently chosen to win, if any
 * @returns one change kind per displayed row, undefined where the row is unaffected
 */
export function resolveRowKinds(block: Block, pending: Side | undefined): (BlockChangeKind | undefined)[] {
  const lines: BySide<string[]> = { local: linesOf(block.text.local), repo: linesOf(block.text.repo) }
  const before = pending ? lines[otherSide(pending)] : lines.repo
  const after = pending ? lines[pending] : lines.local
  return Array.from({ length: Math.max(before.length, after.length) }, (_unused, index) => compareRow(before[index], after[index]))
}

export type BlockAction = 'abort' | 'confirm' | 'down' | 'external' | 'select-local' | 'select-repo' | 'skip-file' | 'toggle-wrap' | 'up'

export type ParsedKey = { ctrl?: boolean; name?: string }

const actionByKeyName = new Map<string, BlockAction>([
  ['a', 'abort'],
  ['q', 'abort'],
  ['e', 'external'],
  ['w', 'toggle-wrap'],
  ['s', 'skip-file'],
  ['up', 'up'],
  ['down', 'down'],
  // the left box holds the repo file, so moving a block leftwards makes the local file win
  ['left', 'select-local'],
  ['right', 'select-repo'],
])

/**
 * Turn a raw keypress into the action it means, while resolving a conflicting block
 * @param key the parsed key
 * @param pending the side currently highlighted, if any
 * @returns the action, or undefined if the key means nothing here
 */
export function classifyBlockKey(key: ParsedKey, pending: Side | undefined): BlockAction | undefined {
  if (!key.name) return undefined
  if (key.ctrl) return key.name === 'c' ? 'abort' : undefined
  if (key.name === 'return') return pending ? 'confirm' : undefined
  return actionByKeyName.get(key.name)
}

export type BlockNavState = {
  choices: (Side | undefined)[]
  currentIndex: number
  pending: Side | undefined
}

export type BlockNavStep = BlockNavState & { done?: false }

export type BlockNavDone = { choices: Side[]; done: true }

export type NavAction = 'confirm' | 'down' | 'select-local' | 'select-repo' | 'up'

/**
 * Start resolving a file : cursor on the first block, nothing chosen yet
 * @param blockCount the number of conflicting blocks to resolve
 * @returns the initial navigation state
 */
export function initialNavState(blockCount: number): BlockNavState {
  return { choices: Array.from({ length: blockCount }), currentIndex: 0, pending: undefined }
}

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
 * Confirm the current block's pending choice : move on to the next unresolved block, or report done
 * @param state the current state
 * @returns the next state, or the final choices once every block is resolved
 */
function confirm(state: BlockNavState): BlockNavDone | BlockNavStep {
  const nextIndex = findNextUnresolved(state.choices, state.currentIndex)
  if (nextIndex !== -1) return moveTo(state, nextIndex)
  const choices = state.choices.filter(choice => !isNil(choice))
  invariant(choices.length === state.choices.length, 'every block should have a choice once none is left unresolved')
  return { choices, done: true }
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
export function stepBlockState(state: BlockNavState, action: NavAction, blockCount: number): BlockNavDone | BlockNavStep {
  if (action === 'select-local') return select(state, 'local')
  if (action === 'select-repo') return select(state, 'repo')
  if (action === 'up') return moveTo(state, Math.max(0, state.currentIndex - 1))
  if (action === 'down') return moveTo(state, Math.min(blockCount - 1, state.currentIndex + 1))
  if (state.pending) return confirm(state)
  return state
}

/**
 * Whether a side will be overwritten in this session : either the other side is the pending choice
 * for the block currently being viewed, or it's already been confirmed for some other block
 * @param state the current navigation state
 * @param side the side to check for an incoming overwrite
 * @returns true if that side would be overwritten
 */
export function isOverwritten(state: BlockNavState, side: Side): boolean {
  const winner = otherSide(side)
  return state.pending === winner || state.choices.includes(winner)
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
