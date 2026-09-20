/* v8 ignore start */
import { spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { logger } from '../logger'
import { type BySide, type Side, sides, type SyncFile } from '../types'
import { applyChoices, type Block, computeBlocks, conflictsOf } from './blocks'
import { waitForKeypressOrResize, withRawKeypresses } from './keypress'
import { type BlockNavState, classifyBlockKey, initialNavState, isOverwritten, matchAction, type ParsedKey, stepBlockState } from './navigation'
import { externalTools, retryActions } from './options'
import { buildPanel, type FileContext } from './render'
import { clearLastRender, draw } from './screen'

const finderCommand = process.platform === 'win32' ? 'where' : 'which'

/** state shared by every file merged in one `pnpm cs` run */
export type MergeSession = {
  /** the external merge tool found on this machine, looked up once and cached ('' once a lookup found none) */ externalTool: string | undefined
  /** a display preference : stays as the user left it for the whole run */ wrapEnabled: boolean
}

/**
 * Start a merge session with nothing looked up and wrapping off
 * @returns the fresh session state
 */
export function createMergeSession(): MergeSession {
  return { externalTool: undefined, wrapEnabled: false }
}

/**
 * Look for a known external merge tool on this machine, once per run
 * @param session the run's shared state, where the result is cached
 * @returns the first found tool binary name, or '' if none is installed
 */
function findExternalTool(session: MergeSession): string {
  session.externalTool ??= externalTools.find(name => spawnSync(finderCommand, [name]).status === 0) ?? ''
  return session.externalTool
}

/**
 * Read each side's current content from disk
 * @param file the file being merged
 * @returns each side's content
 */
function readSides(file: SyncFile): BySide<string> {
  return { local: readFileSync(file.sides.local.filepath, 'utf8'), repo: readFileSync(file.sides.repo.filepath, 'utf8') }
}

/**
 * Each side's current in-memory content
 * @param file the file being merged
 * @returns each side's content
 */
function contentsOf(file: SyncFile): BySide<string> {
  return { local: file.sides.local.content, repo: file.sides.repo.content }
}

/**
 * Wait for the user to resolve every conflicting block in a file, freely navigating between them
 * with up/down before confirming a choice with left/right + Enter, re-rendering on every keypress
 * or terminal resize
 * @param fileContext the file being merged
 * @param conflictBlocks the file's conflicting blocks, in order
 * @param session the run's shared state
 * @returns the final per-block choices, or an early exit
 */
function resolveConflictBlocks(fileContext: FileContext, conflictBlocks: Block[], session: MergeSession): Promise<Side[] | 'abort' | 'external' | 'skip-file'> {
  return withRawKeypresses(async () => {
    let state: BlockNavState = initialNavState(conflictBlocks.length)
    for (;;) {
      const block = conflictBlocks[state.currentIndex]
      const modified: BySide<boolean> = { local: isOverwritten(state, 'local'), repo: isOverwritten(state, 'repo') }
      clearLastRender()
      draw(buildPanel(fileContext, { block, blockIndex: state.currentIndex + 1, blockTotal: conflictBlocks.length, modified, pending: state.pending, wrapEnabled: session.wrapEnabled }))
      // oxlint-disable-next-line no-await-in-loop
      const event = await waitForKeypressOrResize()
      if (event.kind === 'resize') continue
      const action = classifyBlockKey(event.key, state.pending)
      if (action === 'external' || action === 'skip-file' || action === 'abort') return action
      if (action === 'toggle-wrap') {
        session.wrapEnabled = !session.wrapEnabled
        continue
      }
      if (!action) continue
      const nextState = stepBlockState(state, action, conflictBlocks.length)
      if ('done' in nextState && nextState.done) return nextState.choices
      state = nextState
    }
  })
}

/**
 * Wait for the user to press one of a fixed set of keys
 * @param question the question to print
 * @returns the matched action's name
 */
function waitForRetryChoice(question: string): Promise<string> {
  return withRawKeypresses(async () => {
    console.log(question)
    for (const action of retryActions) console.log(`  ${action.key} : ${action.description}`)
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop
      const [, key] = await once(process.stdin, 'keypress')
      const matched = matchAction(retryActions, key as ParsedKey)
      if (matched) return matched
    }
  })
}

/**
 * Hand a file pair off to whatever external merge tool is found on this machine
 * @param file the file to open externally
 * @param session the run's shared state
 * @returns 'external' once the tool has been closed, 'skipped' if none was found
 */
function handOffToExternalTool(file: SyncFile, session: MergeSession): 'external' | 'skipped' {
  const tool = findExternalTool(session)
  clearLastRender()
  console.clear()
  if (!tool) {
    logger.warn(`no external merge tool found on this machine (looked for: ${externalTools.join(', ')})`)
    return 'skipped'
  }
  logger.info(`opening ${tool} for ${file.sides.repo.filepath} ...`)
  spawnSync(tool, [file.sides.repo.filepath, file.sides.local.filepath], { stdio: 'inherit' })
  return 'external'
}

export type FileTask = { file: SyncFile; fileIndex: number; fileTotal: number }

/**
 * Run the block-by-block interactive merge for one file, or hand off to an external tool
 * @param task the file to merge (its content may be stale after a previous attempt)
 * @param session the run's shared state
 * @returns the outcome
 */
async function runOneAttempt(task: FileTask, session: MergeSession): Promise<'abort' | 'external' | 'resolved' | 'skipped'> {
  const { file } = task
  const blocks = computeBlocks(contentsOf(file), file.filters)
  const conflictBlocks = conflictsOf(blocks)
  const outcome = conflictBlocks.length > 0 ? await resolveConflictBlocks({ ...task, blocks }, conflictBlocks, session) : []
  if (outcome === 'abort') return 'abort'
  if (outcome === 'skip-file') return 'skipped'
  if (outcome === 'external') return handOffToExternalTool(file, session)
  const merged = applyChoices(blocks, outcome)
  await Promise.all(sides.map(side => writeFile(file.sides[side].filepath, merged[side])))
  return 'resolved'
}

/**
 * Interactively resolve one out-of-sync file, retrying until it's actually in sync or the user gives up
 * @param task the file to merge and its position among the files being merged
 * @param session the run's shared state
 * @returns the final outcome
 */
export async function resolveFile(task: FileTask, session: MergeSession): Promise<'abort' | 'resolved' | 'skipped'> {
  const { file } = task
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop
    const outcome = await runOneAttempt(task, session)
    if (outcome === 'abort' || outcome === 'skipped') return outcome
    const contents = readSides(file)
    const stillDifferent = conflictsOf(computeBlocks(contents, file.filters)).length > 0
    if (!stillDifferent) {
      // wipe the last panel as soon as it's no longer needed, so it doesn't linger over the next
      // file's panel or the final summary while still keeping every log line printed around it
      clearLastRender()
      logger.info(`✓ ${file.sides.repo.filepath} is now in sync`)
      return 'resolved'
    }
    for (const side of sides) file.sides[side].content = contents[side]
    // oxlint-disable-next-line no-await-in-loop
    const choice = await waitForRetryChoice(`${file.sides.repo.filepath} is still different after merging, what now ?`)
    if (choice === 'abort') return 'abort'
    if (choice === 'skip') return 'skipped'
  }
}
