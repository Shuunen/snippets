/* v8 ignore start */
import { spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { waitForKeypressOrResize, withRawKeypresses } from './merge-keypress.node'
import { applyChoices, classifyBlockKey, computeBlocks, matchAction, stepBlockState, wouldOverwrite, type Block, type BlockNavState, type ParsedKey, type Side } from './merge-logic.node'
import { renderBlock, type FileContext } from './merge-render.node'
import { externalTools as externalToolCandidates, retryActions } from './merge.options'
import type { File } from './types'
import { clean, logger } from './utils.node'

const finderCommand = process.platform === 'win32' ? 'where' : 'which'

// a display preference, not merge state: stays as the user left it for the whole `pnpm cs` run
let wrapEnabled = false

/**
 * Look for a known external merge tool on this machine
 * @returns the first found tool binary name, if any
 */
export function findExternalTool(): string | undefined {
  for (const name of externalToolCandidates) {
    const result = spawnSync(finderCommand, [name])
    if (result.status === 0) return name
  }
  return undefined
}

export type FileTask = { file: File; fileIndex: number; fileTotal: number }

/**
 * Wait for the user to resolve every conflicting block in a file, freely navigating between them
 * with up/down before confirming a choice with left/right + Enter, re-rendering on every keypress
 * or terminal resize
 * @param fileContext the file being merged
 * @param conflictBlocks the file's conflicting blocks, in order
 * @returns the final per-block choices, or an early exit
 */
function resolveConflictBlocks(fileContext: FileContext, conflictBlocks: Block[]): Promise<Side[] | 'abort' | 'external' | 'skip-file'> {
  return withRawKeypresses(async () => {
    let state: BlockNavState = { choices: Array.from({ length: conflictBlocks.length }), currentIndex: 0, pending: undefined }
    for (;;) {
      const block = conflictBlocks[state.currentIndex]
      const destModified = wouldOverwrite(state, 'source')
      const sourceModified = wouldOverwrite(state, 'dest')
      renderBlock(fileContext, { block, blockIndex: state.currentIndex + 1, blockTotal: conflictBlocks.length, destModified, pending: state.pending, sourceModified, wrapEnabled })
      // oxlint-disable-next-line no-await-in-loop
      const event = await waitForKeypressOrResize()
      if (event.kind === 'resize') continue
      const action = classifyBlockKey(event.key, state.pending)
      if (action === 'external' || action === 'skip-file' || action === 'abort') return action
      if (action === 'toggle-wrap') {
        wrapEnabled = !wrapEnabled
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
 * @returns 'external' once the tool has been closed, 'skipped' if none was found
 */
function handOffToExternalTool(file: File): 'external' | 'skipped' {
  const tool = findExternalTool()
  console.clear()
  if (!tool) {
    logger.warn(`no external merge tool found on this machine (looked for: ${externalToolCandidates.join(', ')})`)
    return 'skipped'
  }
  logger.info(`opening ${tool} for ${file.destination.filepath} ...`)
  spawnSync(tool, [file.destination.filepath, file.source.filepath], { stdio: 'inherit' })
  return 'external'
}

/**
 * Run the block-by-block interactive merge for one file, or hand off to an external tool
 * @param fileContext the file to merge (its file.content may be stale after a previous attempt)
 * @returns the outcome
 */
async function runOneAttempt(fileContext: FileTask): Promise<'abort' | 'external' | 'resolved' | 'skipped'> {
  const { file } = fileContext
  const blocks = computeBlocks(file.destination.content, file.source.content)
  const conflictBlocks = blocks.filter(block => block.type === 'conflict')
  const contextWithBlocks = { ...fileContext, blocks }
  const outcome = conflictBlocks.length > 0 ? await resolveConflictBlocks(contextWithBlocks, conflictBlocks) : []
  if (outcome === 'abort' || outcome === 'skip-file') return outcome === 'abort' ? 'abort' : 'skipped'
  if (outcome === 'external') return handOffToExternalTool(file)
  const merged = applyChoices(blocks, outcome)
  await writeFile(file.destination.filepath, merged)
  await writeFile(file.source.filepath, merged)
  return 'resolved'
}

/**
 * Interactively resolve one out-of-sync file, retrying until it's actually in sync or the user gives up
 * @param file the file to merge
 * @param fileIndex 1-based index of the file among all files being merged
 * @param fileTotal total number of files being merged
 * @returns the final outcome
 */
export async function resolveFile(file: File, fileIndex: number, fileTotal: number): Promise<'abort' | 'resolved' | 'skipped'> {
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop
    const outcome = await runOneAttempt({ file, fileIndex, fileTotal })
    if (outcome === 'abort' || outcome === 'skipped') return outcome
    const destContent = readFileSync(file.destination.filepath, 'utf8')
    const sourceContent = readFileSync(file.source.filepath, 'utf8')
    const stillDifferent = clean(destContent, file.removeLinesAfter, file.removeLinesMatching) !== clean(sourceContent, file.removeLinesAfter, file.removeLinesMatching)
    if (!stillDifferent) {
      logger.info(`✓ ${file.destination.filepath} is now in sync`)
      return 'resolved'
    }
    file.destination.content = destContent
    file.source.content = sourceContent
    // oxlint-disable-next-line no-await-in-loop
    const choice = await waitForRetryChoice(`${file.destination.filepath} is still different after merging, what now ?`)
    if (choice === 'abort') return 'abort'
    if (choice === 'skip') return 'skipped'
  }
}
