import { invariant } from 'es-toolkit'
import type { Block } from './merge-blocks.node'
import {
  applyChoices,
  classifyBlockChange,
  classifyBlockKey,
  computeBlocks,
  guessLanguage,
  linesOf,
  matchAction,
  resolveBlockPreview,
  resolvePendingKind,
  stepBlockState,
  truncateLine,
  type BlockNavState,
  wouldOverwrite,
  wrapLines,
} from './merge-logic.node'

const freshState = (): BlockNavState => ({ choices: [undefined, undefined, undefined], currentIndex: 0, pending: undefined })

const makeBlock = (destText: string, sourceText: string): Block => ({ destText, sourceText, type: 'conflict' })

describe('merge logic', () => {
  it('computeBlocks finds no conflict on identical content', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nb\nc')
    expect(blocks.every(block => block.type === 'common')).toBe(true)
  })

  it('computeBlocks finds a single conflict block on a changed line', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(linesOf(conflicts[0]?.destText ?? '')).toStrictEqual(['b'])
    expect(linesOf(conflicts[0]?.sourceText ?? '')).toStrictEqual(['B'])
  })

  it('computeBlocks finds a dest-only conflict block on a removed line', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nc')
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(linesOf(conflicts[0]?.destText ?? '')).toStrictEqual(['b'])
    expect(conflicts[0]?.sourceText).toBe('')
  })

  it('computeBlocks finds a source-only conflict block on an added line', () => {
    const blocks = computeBlocks('a\nc', 'a\nb\nc')
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.destText).toBe('')
    expect(linesOf(conflicts[0]?.sourceText ?? '')).toStrictEqual(['b'])
  })

  it('computeBlocks flags a conflict as noise when every line matches removeLinesMatching on both sides', () => {
    const blocks = computeBlocks('a\nLastUpdateCheck=1\nc', 'a\nLastUpdateCheck=2\nc', undefined, [/^LastUpdateCheck=/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks does not flag a conflict as noise when only one side matches removeLinesMatching', () => {
    const blocks = computeBlocks('a\nLastUpdateCheck=1\nc', 'a\nsomethingElse=2\nc', undefined, [/^LastUpdateCheck=/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('computeBlocks flags a pure addition as noise when the added line matches removeLinesMatching', () => {
    const blocks = computeBlocks('a\nc', 'a\nLastUpdateCheck=1\nc', undefined, [/^LastUpdateCheck=/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks flags a conflict as noise when it falls after a removeLinesAfter cutoff on both sides', () => {
    const blocks = computeBlocks('a\n[History]\nx=1', 'a\n[History]\nx=2', /^\[History\]/u)
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks does not flag a conflict as noise when it falls before a removeLinesAfter cutoff', () => {
    const blocks = computeBlocks('a\nb\n[History]', 'a\nB\n[History]', /^\[History\]/u)
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('computeBlocks carves a noise line out of a multi-line addition instead of hiding the whole thing', () => {
    const blocks = computeBlocks('[AddNewTorrentDialog]\nEnabled=true', '[AddNewTorrentDialog]\nAttached=false\nDialogSize=@Size(1506 769)\nEnabled=true', undefined, [/@Size/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(2)
    expect(linesOf(conflicts[0]?.sourceText ?? '')).toStrictEqual(['Attached=false'])
    expect(conflicts[0]?.isNoise).toBe(false)
    expect(linesOf(conflicts[1]?.sourceText ?? '')).toStrictEqual(['DialogSize=@Size(1506 769)'])
    expect(conflicts[1]?.isNoise).toBe(true)
  })

  it('computeBlocks keeps a differing-line-count modification as one block when it is not noise', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nC\nc')
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(linesOf(conflicts[0]?.destText ?? '')).toStrictEqual(['b'])
    expect(linesOf(conflicts[0]?.sourceText ?? '')).toStrictEqual(['B', 'C'])
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('computeBlocks flags a differing-line-count modification as noise when every line on both sides is ignorable', () => {
    const blocks = computeBlocks('a\nLastUpdateCheck=1\nc', 'a\nLastUpdateCheck=2\nExtra=1\nc', undefined, [/^(?<key>LastUpdateCheck=|Extra=)/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('applyChoices keeps dest lines on both sides when choosing dest', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    expect(applyChoices(blocks, ['dest'])).toStrictEqual({ destOutput: 'a\nb\nc', sourceOutput: 'a\nb\nc' })
  })

  it('applyChoices keeps source lines on both sides when choosing source', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    expect(applyChoices(blocks, ['source'])).toStrictEqual({ destOutput: 'a\nB\nc', sourceOutput: 'a\nB\nc' })
  })

  it('applyChoices defaults to dest when a choice is missing', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    expect(applyChoices(blocks, [])).toStrictEqual({ destOutput: 'a\nb\nc', sourceOutput: 'a\nb\nc' })
  })

  it('computeBlocks flags a conflict as noise when its text matches a removeBlocksMatching pattern', () => {
    const blocks = computeBlocks('[AddNewTorrentDialog]\nEnabled=true', '[TorrentCreator]\nEnabled=true\n[AddNewTorrentDialog]\nEnabled=true', undefined, undefined, [/\[TorrentCreator\]/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks keeps a whole matching addition as one noise block, even when only part of it matches removeLinesMatching', () => {
    const dest = '[TorrentAdditionDlg]\nsave_path_history=~/Downloads\n'
    const source = `${dest}[TorrentCreator]\nComments=\nSize=@Size(592 731)\nSource=\nStartSeeding=true\n`
    const blocks = computeBlocks(dest, source, undefined, [/@Size/u], [/\[TorrentCreator\]/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
    expect(conflicts[0]?.sourceText).toContain('StartSeeding=true')
  })

  it('computeBlocks keeps a whole matching removal as one noise block on the dest side', () => {
    const source = '[TorrentAdditionDlg]\nsave_path_history=~/Downloads\n'
    const dest = `${source}[TorrentCreator]\nComments=\nSize=@Size(592 731)\nSource=\nStartSeeding=true\n`
    const blocks = computeBlocks(dest, source, undefined, [/@Size/u], [/\[TorrentCreator\]/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
    expect(conflicts[0]?.destText).toContain('StartSeeding=true')
  })

  it('computeBlocks treats a modification differing only by trailing whitespace as noise, with no filters needed', () => {
    const blocks = computeBlocks('a\nb \nc', 'a\nb\nc')
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks excludes a change to a setting inside an existing, untouched section that matches removeBlocksMatching', () => {
    const dest = '[Preferences]\nEnabled=true\n[AddNewTorrentDialog]\nEnabled=false\n[General]\nLocale=en\n'
    const source = '[Preferences]\nEnabled=true\n[AddNewTorrentDialog]\nEnabled=true\n[General]\nLocale=en\n'
    const blocks = computeBlocks(dest, source, undefined, undefined, [/Dialog\]/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks does not flag a conflict as noise when no removeBlocksMatching pattern matches', () => {
    const blocks = computeBlocks('a\nc', 'a\nb\nc', undefined, undefined, [/\[TorrentCreator\]/u])
    const conflicts = blocks.filter(block => block.type === 'conflict')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('applyChoices leaves a noise block untouched on each side, without consuming a choice', () => {
    const blocks = computeBlocks('a\nLastUpdateCheck=1\nc', 'a\nLastUpdateCheck=2\nc', undefined, [/^LastUpdateCheck=/u])
    expect(applyChoices(blocks, [])).toStrictEqual({ destOutput: 'a\nLastUpdateCheck=1\nc', sourceOutput: 'a\nLastUpdateCheck=2\nc' })
  })

  it('classifyBlockChange detects a pure addition', () => {
    const blocks = computeBlocks('a\nc', 'a\nb\nc')
    const conflict = blocks.find(block => block.type === 'conflict')
    invariant(conflict, 'expected a conflict block')
    expect(classifyBlockChange(conflict)).toBe('addition')
  })

  it('classifyBlockChange detects a pure removal', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nc')
    const conflict = blocks.find(block => block.type === 'conflict')
    invariant(conflict, 'expected a conflict block')
    expect(classifyBlockChange(conflict)).toBe('removal')
  })

  it('classifyBlockChange detects a modification', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    const conflict = blocks.find(block => block.type === 'conflict')
    invariant(conflict, 'expected a conflict block')
    expect(classifyBlockChange(conflict)).toBe('modification')
  })

  it('guessLanguage detects bash', () => {
    expect(guessLanguage('/home/me/.bash_aliases')).toBe('bash')
  })

  it('guessLanguage detects json', () => {
    expect(guessLanguage('/home/me/settings.json')).toBe('json')
  })

  it('guessLanguage returns undefined for unknown extensions', () => {
    expect(guessLanguage('/home/me/some.weird-ext')).toBeUndefined()
  })

  it('classifyBlockKey maps left to select-source', () => {
    expect(classifyBlockKey({ name: 'left' }, undefined)).toBe('select-source')
  })

  it('classifyBlockKey maps right to select-dest', () => {
    expect(classifyBlockKey({ name: 'right' }, undefined)).toBe('select-dest')
  })

  it('classifyBlockKey maps return to confirm only when a side is pending', () => {
    expect(classifyBlockKey({ name: 'return' }, 'dest')).toBe('confirm')
    expect(classifyBlockKey({ name: 'return' }, undefined)).toBeUndefined()
  })

  it('classifyBlockKey maps e/w/s/a/q to external/toggle-wrap/skip-file/abort', () => {
    expect(classifyBlockKey({ name: 'e' }, undefined)).toBe('external')
    expect(classifyBlockKey({ name: 'w' }, undefined)).toBe('toggle-wrap')
    expect(classifyBlockKey({ name: 's' }, undefined)).toBe('skip-file')
    expect(classifyBlockKey({ name: 'a' }, undefined)).toBe('abort')
    expect(classifyBlockKey({ name: 'q' }, undefined)).toBe('abort')
  })

  it('classifyBlockKey maps ctrl+c to abort', () => {
    expect(classifyBlockKey({ ctrl: true, name: 'c' }, undefined)).toBe('abort')
  })

  it('classifyBlockKey ignores unknown keys', () => {
    expect(classifyBlockKey({ name: 'x' }, undefined)).toBeUndefined()
  })

  it('classifyBlockKey ignores keys with no name', () => {
    expect(classifyBlockKey({}, undefined)).toBeUndefined()
  })

  const retryActions = [
    { description: 'abort everything', key: 'a/q', name: 'abort' },
    { description: 'retry merging this file', key: 'r', name: 'retry' },
    { description: 'skip this file for now', key: 's', name: 'skip' },
  ]

  it('matchAction finds the matching action name', () => {
    expect(matchAction(retryActions, { name: 'r' })).toBe('retry')
  })

  it('matchAction returns undefined when nothing matches', () => {
    expect(matchAction(retryActions, { name: 'z' })).toBeUndefined()
  })

  it('matchAction matches any of several alternative keys', () => {
    expect(matchAction(retryActions, { name: 'a' })).toBe('abort')
    expect(matchAction(retryActions, { name: 'q' })).toBe('abort')
  })

  it('matchAction returns undefined for a key with no name', () => {
    expect(matchAction(retryActions, {})).toBeUndefined()
  })

  it('wrapLines leaves short lines untouched', () => {
    expect(wrapLines(['abc'], 10)).toStrictEqual(['abc'])
  })

  it('wrapLines splits a long line into width-sized chunks', () => {
    expect(wrapLines(['abcdefghij'], 4)).toStrictEqual(['abcd', 'efgh', 'ij'])
  })

  it('wrapLines never lets a chunk exceed the given width', () => {
    const wrapped = wrapLines(['# Token savings summary : rtk (bash output filtering) + Headroom (API-side compression)'], 38)
    expect(wrapped.every(line => line.length <= 38)).toBe(true)
  })

  it('wrapLines keeps empty lines as-is', () => {
    expect(wrapLines([''], 10)).toStrictEqual([''])
  })

  it('wrapLines is a no-op for a non-positive width', () => {
    expect(wrapLines(['abcdef'], 0)).toStrictEqual(['abcdef'])
  })

  it('truncateLine leaves short lines untouched', () => {
    expect(truncateLine('abc', 10)).toBe('abc')
  })

  it('truncateLine cuts a long line and marks it with an ellipsis', () => {
    expect(truncateLine('abcdefghij', 5)).toBe('abcd…')
  })

  it('truncateLine never lets the result exceed the given width', () => {
    expect(truncateLine('abcdefghij', 5)).toHaveLength(5)
  })

  it('classifyBlockKey maps up/down to navigation actions', () => {
    expect(classifyBlockKey({ name: 'up' }, undefined)).toBe('up')
    expect(classifyBlockKey({ name: 'down' }, undefined)).toBe('down')
  })

  it('stepBlockState select-source/select-dest record the choice immediately, without moving', () => {
    expect(stepBlockState(freshState(), 'select-source', 3)).toStrictEqual({ choices: ['source', undefined, undefined], currentIndex: 0, pending: 'source' })
    expect(stepBlockState(freshState(), 'select-dest', 3)).toStrictEqual({ choices: ['dest', undefined, undefined], currentIndex: 0, pending: 'dest' })
  })

  it('stepBlockState select survives navigating away and back, without pressing confirm', () => {
    const selected = stepBlockState(freshState(), 'select-source', 3)
    invariant(!('done' in selected), 'select-source should never report done')
    const movedAway = stepBlockState(selected, 'down', 3)
    invariant(!('done' in movedAway), 'down should never report done')
    expect(movedAway).toMatchObject({ currentIndex: 1, pending: undefined })
    const movedBack = stepBlockState(movedAway, 'up', 3)
    expect(movedBack).toStrictEqual({ choices: ['source', undefined, undefined], currentIndex: 0, pending: 'source' })
  })

  it('stepBlockState up/down move the cursor and clamp at the edges', () => {
    expect(stepBlockState(freshState(), 'up', 3)).toMatchObject({ currentIndex: 0 })
    expect(stepBlockState(freshState(), 'down', 3)).toMatchObject({ currentIndex: 1 })
    expect(stepBlockState({ choices: [undefined, undefined, undefined], currentIndex: 2, pending: undefined }, 'down', 3)).toMatchObject({ currentIndex: 2 })
  })

  it("stepBlockState down restores the target block's already-selected choice as pending", () => {
    const state: BlockNavState = { choices: ['dest', undefined, undefined], currentIndex: 1, pending: undefined }
    expect(stepBlockState(state, 'up', 3)).toStrictEqual({ choices: state.choices, currentIndex: 0, pending: 'dest' })
  })

  it('stepBlockState confirm without a pending side is a no-op', () => {
    const state = freshState()
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual(state)
  })

  it('stepBlockState confirm jumps to the next unresolved block, without changing the choices', () => {
    const state: BlockNavState = { choices: ['dest', undefined, undefined], currentIndex: 0, pending: 'dest' }
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual({ choices: ['dest', undefined, undefined], currentIndex: 1, pending: undefined })
  })

  it('stepBlockState confirm wraps around to find an earlier unresolved block', () => {
    const state: BlockNavState = { choices: [undefined, 'source', 'dest'], currentIndex: 2, pending: 'dest' }
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual({ choices: [undefined, 'source', 'dest'], currentIndex: 0, pending: undefined })
  })

  it('stepBlockState confirm reports done once every block is resolved', () => {
    const state: BlockNavState = { choices: ['dest', 'source', 'dest'], currentIndex: 2, pending: 'dest' }
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual({ choices: ['dest', 'source', 'dest'], done: true })
  })

  it('wouldOverwrite is true when the side is the current pending choice', () => {
    expect(wouldOverwrite({ choices: [undefined], currentIndex: 0, pending: 'source' }, 'source')).toBe(true)
    expect(wouldOverwrite({ choices: [undefined], currentIndex: 0, pending: 'source' }, 'dest')).toBe(false)
  })

  it('wouldOverwrite is true when the side was already confirmed for another block', () => {
    expect(wouldOverwrite({ choices: ['dest', undefined], currentIndex: 1, pending: undefined }, 'dest')).toBe(true)
    expect(wouldOverwrite({ choices: ['dest', undefined], currentIndex: 1, pending: undefined }, 'source')).toBe(false)
  })

  it('wouldOverwrite is false when nothing points to that side', () => {
    expect(wouldOverwrite({ choices: [undefined, undefined], currentIndex: 0, pending: undefined }, 'dest')).toBe(false)
    expect(wouldOverwrite({ choices: [undefined, undefined], currentIndex: 0, pending: undefined }, 'source')).toBe(false)
  })

  it('resolvePendingKind detects an addition when dest wins over an empty source', () => {
    expect(resolvePendingKind(makeBlock('b', ''), 'dest')).toBe('addition')
  })

  it('resolvePendingKind detects a removal when dest wins with an empty text', () => {
    expect(resolvePendingKind(makeBlock('', 'b'), 'dest')).toBe('removal')
  })

  it('resolvePendingKind detects a modification when dest wins over non-empty source', () => {
    expect(resolvePendingKind(makeBlock('b', 'B'), 'dest')).toBe('modification')
  })

  it('resolvePendingKind detects an addition when source wins over an empty dest', () => {
    expect(resolvePendingKind(makeBlock('', 'b'), 'source')).toBe('addition')
  })

  it('resolvePendingKind detects a removal when source wins with an empty text', () => {
    expect(resolvePendingKind(makeBlock('b', ''), 'source')).toBe('removal')
  })

  it('resolvePendingKind detects a modification when source wins over non-empty dest', () => {
    expect(resolvePendingKind(makeBlock('b', 'B'), 'source')).toBe('modification')
  })

  it('resolveBlockPreview shows each side its own text when nothing is pending', () => {
    expect(resolveBlockPreview(makeBlock('b', 'B'), undefined)).toStrictEqual({ destDeleted: false, destText: 'b', sourceDeleted: false, sourceText: 'B' })
  })

  it('resolveBlockPreview previews the incoming source text on dest when dest is overwritten by a modification', () => {
    expect(resolveBlockPreview(makeBlock('b', 'B'), 'source')).toStrictEqual({ destDeleted: false, destText: 'B', sourceDeleted: false, sourceText: 'B' })
  })

  it('resolveBlockPreview previews the incoming dest text on source when source is overwritten by a modification', () => {
    expect(resolveBlockPreview(makeBlock('b', 'B'), 'dest')).toStrictEqual({ destDeleted: false, destText: 'b', sourceDeleted: false, sourceText: 'b' })
  })

  it('resolveBlockPreview keeps and flags the dest text as deleted when choosing source would erase it', () => {
    expect(resolveBlockPreview(makeBlock('b', ''), 'source')).toStrictEqual({ destDeleted: true, destText: 'b', sourceDeleted: false, sourceText: '' })
  })

  it('resolveBlockPreview keeps and flags the source text as deleted when choosing dest would erase it', () => {
    expect(resolveBlockPreview(makeBlock('', 'b'), 'dest')).toStrictEqual({ destDeleted: false, destText: '', sourceDeleted: true, sourceText: 'b' })
  })
})
