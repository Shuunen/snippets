import { invariant } from 'es-toolkit'
import type { Block } from './blocks'
import { type BlockNavState, classifyBlockChange, classifyBlockKey, initialNavState, isOverwritten, matchAction, otherSide, resolveBlockPreview, resolveDisplayKind, resolvePendingKind, resolveRowKinds, stepBlockState } from './navigation'

const freshState = (): BlockNavState => ({ choices: [undefined, undefined, undefined], currentIndex: 0, pending: undefined })

const makeBlock = (repo: string, local: string): Block => ({ text: { local, repo }, type: 'conflict' })

const retryActions = [
  { description: 'abort everything', key: 'a/q', name: 'abort' },
  { description: 'retry merging this file', key: 'r', name: 'retry' },
  { description: 'skip this file for now', key: 's', name: 'skip' },
]

describe('merge navigation', () => {
  it('otherSide flips a side', () => {
    expect(otherSide('repo')).toBe('local')
    expect(otherSide('local')).toBe('repo')
  })

  it('classifyBlockChange detects a pure addition', () => {
    expect(classifyBlockChange(makeBlock('', 'b'))).toBe('addition')
  })

  it('classifyBlockChange detects a pure removal', () => {
    expect(classifyBlockChange(makeBlock('b', ''))).toBe('removal')
  })

  it('classifyBlockChange detects a modification', () => {
    expect(classifyBlockChange(makeBlock('b', 'B'))).toBe('modification')
  })

  it('resolveDisplayKind falls back to the block kind while nothing is pending', () => {
    expect(resolveDisplayKind(makeBlock('', 'b'), undefined)).toBe('addition')
    expect(resolveDisplayKind(makeBlock('', 'b'), 'repo')).toBe('removal')
  })

  it('resolvePendingKind detects an addition when repo wins over an empty local', () => {
    expect(resolvePendingKind(makeBlock('b', ''), 'repo')).toBe('addition')
  })

  it('resolvePendingKind detects a removal when repo wins with an empty text', () => {
    expect(resolvePendingKind(makeBlock('', 'b'), 'repo')).toBe('removal')
  })

  it('resolvePendingKind detects a modification when repo wins over non-empty local', () => {
    expect(resolvePendingKind(makeBlock('b', 'B'), 'repo')).toBe('modification')
  })

  it('resolvePendingKind detects an addition when local wins over an empty repo', () => {
    expect(resolvePendingKind(makeBlock('', 'b'), 'local')).toBe('addition')
  })

  it('resolvePendingKind detects a removal when local wins with an empty text', () => {
    expect(resolvePendingKind(makeBlock('b', ''), 'local')).toBe('removal')
  })

  it('resolvePendingKind detects a modification when local wins over non-empty repo', () => {
    expect(resolvePendingKind(makeBlock('b', 'B'), 'local')).toBe('modification')
  })

  it('resolveBlockPreview shows each side its own lines when nothing is pending', () => {
    expect(resolveBlockPreview(makeBlock('b', 'B'), undefined)).toStrictEqual({ local: [{ isDeleted: false, text: 'B' }], repo: [{ isDeleted: false, text: 'b' }] })
  })

  it('resolveBlockPreview keeps repo showing its own text when repo is overwritten by a modification, so the render layer can strike what it loses', () => {
    expect(resolveBlockPreview(makeBlock('b', 'B'), 'local')).toStrictEqual({ local: [{ isDeleted: false, text: 'B' }], repo: [{ isDeleted: false, text: 'b' }] })
  })

  it('resolveBlockPreview keeps local showing its own text when local is overwritten by a modification, so the render layer can strike what it loses', () => {
    expect(resolveBlockPreview(makeBlock('b', 'B'), 'repo')).toStrictEqual({ local: [{ isDeleted: false, text: 'B' }], repo: [{ isDeleted: false, text: 'b' }] })
  })

  it('resolveBlockPreview keeps and flags the repo lines as deleted when choosing local would erase them', () => {
    expect(resolveBlockPreview(makeBlock('b', ''), 'local')).toStrictEqual({ local: [], repo: [{ isDeleted: true, text: 'b' }] })
  })

  it('resolveBlockPreview keeps and flags the local lines as deleted when choosing repo would erase them', () => {
    expect(resolveBlockPreview(makeBlock('', 'b'), 'repo')).toStrictEqual({ local: [{ isDeleted: true, text: 'b' }], repo: [] })
  })

  it("resolveBlockPreview keeps the overlapping line as local's own text (comma and all) and flags the surplus line a shrinking modification would drop", () => {
    const block = makeBlock('  "voiceEnabled": false\n', '  "voiceEnabled": false,\n  "model": "opus"\n')
    expect(resolveBlockPreview(block, 'repo')).toStrictEqual({
      local: [
        { isDeleted: false, text: '  "voiceEnabled": false,' },
        { isDeleted: true, text: '  "model": "opus"' },
      ],
      repo: [{ isDeleted: false, text: '  "voiceEnabled": false' }],
    })
  })

  it('resolveBlockPreview flags nothing when a growing modification only adds lines, while the overlapping line still shows each side its own text', () => {
    const block = makeBlock('  "voiceEnabled": false\n', '  "voiceEnabled": false,\n  "model": "opus"\n')
    const preview = resolveBlockPreview(block, 'local')
    expect(preview.repo).toStrictEqual([
      { isDeleted: false, text: '  "voiceEnabled": false' },
      { isDeleted: false, text: '  "model": "opus"' },
    ])
    expect(preview.local).toStrictEqual([
      { isDeleted: false, text: '  "voiceEnabled": false,' },
      { isDeleted: false, text: '  "model": "opus"' },
    ])
    expect(preview.repo.every(line => !line.isDeleted)).toBe(true)
  })

  it('resolveBlockPreview flags every surplus line when a side loses several at once', () => {
    const preview = resolveBlockPreview(makeBlock('one\n', 'one\ntwo\nthree\n'), 'repo')
    expect(preview.local.filter(line => line.isDeleted).map(line => line.text)).toStrictEqual(['two', 'three'])
  })

  it('resolveRowKinds judges each row against the backup while nothing is chosen', () => {
    expect(resolveRowKinds(makeBlock('b', 'B'), undefined)).toStrictEqual(['modification'])
    expect(resolveRowKinds(makeBlock('', 'b'), undefined)).toStrictEqual(['addition'])
    expect(resolveRowKinds(makeBlock('b', ''), undefined)).toStrictEqual(['removal'])
  })

  it('resolveRowKinds reports a shrinking modification as a swap then a drop', () => {
    expect(resolveRowKinds(makeBlock('one\n', 'one-ish\ntwo\n'), 'repo')).toStrictEqual(['modification', 'removal'])
  })

  it('resolveRowKinds reports a growing modification as a swap then a gain', () => {
    expect(resolveRowKinds(makeBlock('one\n', 'one-ish\ntwo\n'), 'local')).toStrictEqual(['modification', 'addition'])
  })

  it('resolveRowKinds leaves a row untouched by the choice unreported', () => {
    expect(resolveRowKinds(makeBlock('same\n', 'same\ntwo\n'), 'repo')).toStrictEqual([undefined, 'removal'])
  })

  it('resolveRowKinds reports every row of a wipe-out as a removal', () => {
    expect(resolveRowKinds(makeBlock('one\ntwo\n', ''), 'local')).toStrictEqual(['removal', 'removal'])
  })

  it('classifyBlockKey maps left to select-local, since the left box holds the repo file', () => {
    expect(classifyBlockKey({ name: 'left' }, undefined)).toBe('select-local')
  })

  it('classifyBlockKey maps right to select-repo', () => {
    expect(classifyBlockKey({ name: 'right' }, undefined)).toBe('select-repo')
  })

  it('classifyBlockKey maps return to confirm only when a side is pending', () => {
    expect(classifyBlockKey({ name: 'return' }, 'repo')).toBe('confirm')
    expect(classifyBlockKey({ name: 'return' }, undefined)).toBeUndefined()
  })

  it('classifyBlockKey maps e/w/s/a/q to external/toggle-wrap/skip-file/abort', () => {
    expect(classifyBlockKey({ name: 'e' }, undefined)).toBe('external')
    expect(classifyBlockKey({ name: 'w' }, undefined)).toBe('toggle-wrap')
    expect(classifyBlockKey({ name: 's' }, undefined)).toBe('skip-file')
    expect(classifyBlockKey({ name: 'a' }, undefined)).toBe('abort')
    expect(classifyBlockKey({ name: 'q' }, undefined)).toBe('abort')
  })

  it('classifyBlockKey maps up/down to navigation actions', () => {
    expect(classifyBlockKey({ name: 'up' }, undefined)).toBe('up')
    expect(classifyBlockKey({ name: 'down' }, undefined)).toBe('down')
  })

  it('classifyBlockKey maps ctrl+c to abort, and ignores any other ctrl combo', () => {
    expect(classifyBlockKey({ ctrl: true, name: 'c' }, undefined)).toBe('abort')
    expect(classifyBlockKey({ ctrl: true, name: 'w' }, undefined)).toBeUndefined()
  })

  it('classifyBlockKey ignores unknown keys', () => {
    expect(classifyBlockKey({ name: 'x' }, undefined)).toBeUndefined()
  })

  it('classifyBlockKey ignores keys with no name', () => {
    expect(classifyBlockKey({}, undefined)).toBeUndefined()
  })

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

  it('initialNavState starts on the first block with nothing chosen', () => {
    expect(initialNavState(3)).toStrictEqual(freshState())
  })

  it('stepBlockState select-local/select-repo record the choice immediately, without moving', () => {
    expect(stepBlockState(freshState(), 'select-local', 3)).toStrictEqual({ choices: ['local', undefined, undefined], currentIndex: 0, pending: 'local' })
    expect(stepBlockState(freshState(), 'select-repo', 3)).toStrictEqual({ choices: ['repo', undefined, undefined], currentIndex: 0, pending: 'repo' })
  })

  it('stepBlockState select survives navigating away and back, without pressing confirm', () => {
    const selected = stepBlockState(freshState(), 'select-local', 3)
    invariant(!('done' in selected), 'select-local should never report done')
    const movedAway = stepBlockState(selected, 'down', 3)
    invariant(!('done' in movedAway), 'down should never report done')
    expect(movedAway).toMatchObject({ currentIndex: 1, pending: undefined })
    const movedBack = stepBlockState(movedAway, 'up', 3)
    expect(movedBack).toStrictEqual({ choices: ['local', undefined, undefined], currentIndex: 0, pending: 'local' })
  })

  it('stepBlockState up/down move the cursor and clamp at the edges', () => {
    expect(stepBlockState(freshState(), 'up', 3)).toMatchObject({ currentIndex: 0 })
    expect(stepBlockState(freshState(), 'down', 3)).toMatchObject({ currentIndex: 1 })
    expect(stepBlockState({ choices: [undefined, undefined, undefined], currentIndex: 2, pending: undefined }, 'down', 3)).toMatchObject({ currentIndex: 2 })
  })

  it("stepBlockState up restores the target block's already-selected choice as pending", () => {
    const state: BlockNavState = { choices: ['repo', undefined, undefined], currentIndex: 1, pending: undefined }
    expect(stepBlockState(state, 'up', 3)).toStrictEqual({ choices: state.choices, currentIndex: 0, pending: 'repo' })
  })

  it('stepBlockState confirm without a pending side is a no-op', () => {
    const state = freshState()
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual(state)
  })

  it('stepBlockState confirm jumps to the next unresolved block, without changing the choices', () => {
    const state: BlockNavState = { choices: ['repo', undefined, undefined], currentIndex: 0, pending: 'repo' }
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual({ choices: ['repo', undefined, undefined], currentIndex: 1, pending: undefined })
  })

  it('stepBlockState confirm wraps around to find an earlier unresolved block', () => {
    const state: BlockNavState = { choices: [undefined, 'local', 'repo'], currentIndex: 2, pending: 'repo' }
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual({ choices: [undefined, 'local', 'repo'], currentIndex: 0, pending: undefined })
  })

  it('stepBlockState confirm reports done once every block is resolved', () => {
    const state: BlockNavState = { choices: ['repo', 'local', 'repo'], currentIndex: 2, pending: 'repo' }
    expect(stepBlockState(state, 'confirm', 3)).toStrictEqual({ choices: ['repo', 'local', 'repo'], done: true })
  })

  it('isOverwritten is true for the side the current pending choice would overwrite', () => {
    expect(isOverwritten({ choices: [undefined], currentIndex: 0, pending: 'local' }, 'repo')).toBe(true)
    expect(isOverwritten({ choices: [undefined], currentIndex: 0, pending: 'local' }, 'local')).toBe(false)
  })

  it('isOverwritten is true when the other side was already confirmed for another block', () => {
    expect(isOverwritten({ choices: ['repo', undefined], currentIndex: 1, pending: undefined }, 'local')).toBe(true)
    expect(isOverwritten({ choices: ['repo', undefined], currentIndex: 1, pending: undefined }, 'repo')).toBe(false)
  })

  it('isOverwritten is false when nothing points to either side', () => {
    expect(isOverwritten({ choices: [undefined, undefined], currentIndex: 0, pending: undefined }, 'repo')).toBe(false)
    expect(isOverwritten({ choices: [undefined, undefined], currentIndex: 0, pending: undefined }, 'local')).toBe(false)
  })
})
