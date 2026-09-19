import { invariant } from 'es-toolkit'
import { applyChoices, classifyBlockChange, classifyBlockKey, computeBlocks, guessLanguage, linesOf, matchAction, stepBlockState, truncateLine, type BlockNavState, wouldOverwrite, wrapLines } from './merge-logic.node'

const freshState = (): BlockNavState => ({ choices: [undefined, undefined, undefined], currentIndex: 0, pending: undefined })

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

  it('applyChoices keeps dest lines when choosing dest', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    expect(applyChoices(blocks, ['dest'])).toBe('a\nb\nc')
  })

  it('applyChoices keeps source lines when choosing source', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    expect(applyChoices(blocks, ['source'])).toBe('a\nB\nc')
  })

  it('applyChoices defaults to dest when a choice is missing', () => {
    const blocks = computeBlocks('a\nb\nc', 'a\nB\nc')
    expect(applyChoices(blocks, [])).toBe('a\nb\nc')
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
})
