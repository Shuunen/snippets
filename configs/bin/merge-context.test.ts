import { invariant } from 'es-toolkit'
import { contextAround, pickContext } from './merge-context.node'
import { computeBlocks, type Block } from './merge-logic.node'

describe('merge context', () => {
  it('contextAround finds common lines on both sides of a conflict', () => {
    const blocks = computeBlocks('a\nb\nc\nd', 'a\nB\nc\nd')
    const conflict = blocks.find(block => block.type === 'conflict')
    invariant(conflict, 'expected a conflict block')
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c', 'd'], afterPreview: undefined, before: ['a'], beforePreview: undefined })
  })

  it('contextAround returns empty arrays when the conflict is at a file boundary', () => {
    const blocks = computeBlocks('b\nc', 'B\nc')
    const conflict = blocks.find(block => block.type === 'conflict')
    invariant(conflict, 'expected a conflict block')
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c'], afterPreview: undefined, before: [], beforePreview: undefined })
  })

  it('contextAround previews the next conflict once the true common context runs out', () => {
    const conflict: Block = { destText: 'x', sourceText: 'X', type: 'conflict' }
    const nextConflict: Block = { destText: 'y\n', sourceText: 'Y\n', type: 'conflict' }
    const previousConflict: Block = { destText: 'w\n', sourceText: 'W\n', type: 'conflict' }
    const blocks: Block[] = [previousConflict, { destText: 'a\n', sourceText: 'a\n', type: 'common' }, conflict, { destText: 'c\n', sourceText: 'c\n', type: 'common' }, nextConflict]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c'], afterPreview: ['y'], before: ['a'], beforePreview: ['w'] })
  })

  it('contextAround leaves the preview undefined when the neighboring conflict is a pure addition with no dest text', () => {
    const conflict: Block = { destText: 'x', sourceText: 'X', type: 'conflict' }
    const additionOnlyNext: Block = { destText: '', sourceText: 'Y\n', type: 'conflict' }
    const blocks: Block[] = [conflict, additionOnlyNext]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: [], afterPreview: undefined, before: [], beforePreview: undefined })
  })

  it('contextAround walks through several consecutive common blocks on each side', () => {
    const conflict: Block = { destText: 'x', sourceText: 'X', type: 'conflict' }
    const blocks: Block[] = [
      { destText: 'a\n', sourceText: 'a\n', type: 'common' },
      { destText: 'b\n', sourceText: 'b\n', type: 'common' },
      conflict,
      { destText: 'c\n', sourceText: 'c\n', type: 'common' },
      { destText: 'd\n', sourceText: 'd\n', type: 'common' },
    ]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c', 'd'], afterPreview: undefined, before: ['a', 'b'], beforePreview: undefined })
  })

  it('pickContext splits the budget evenly when both sides have enough lines', () => {
    expect(pickContext(['a1', 'a2', 'a3'], ['b1', 'b2', 'b3'], 4)).toStrictEqual({ after: ['b1', 'b2'], before: ['a2', 'a3'] })
  })

  it('pickContext gives the leftover budget to the other side when one runs short', () => {
    expect(pickContext(['a1'], ['b1', 'b2', 'b3'], 4)).toStrictEqual({ after: ['b1', 'b2', 'b3'], before: ['a1'] })
  })

  it('pickContext returns nothing for a zero or negative budget', () => {
    expect(pickContext(['a1'], ['b1'], 0)).toStrictEqual({ after: [], before: [] })
    expect(pickContext(['a1'], ['b1'], -5)).toStrictEqual({ after: [], before: [] })
  })

  it('pickContext gives before the leftover budget when after runs out first', () => {
    expect(pickContext(['a1', 'a2', 'a3', 'a4', 'a5'], ['b1'], 6)).toStrictEqual({ after: ['b1'], before: ['a1', 'a2', 'a3', 'a4', 'a5'] })
  })

  it('contextAround treats a missing destText defensively as an empty line, both walking through it and previewing it', () => {
    const conflict: Block = { destText: 'x', sourceText: 'X', type: 'conflict' }
    const commonWithoutDestText = { sourceText: 'a\n', type: 'common' } as unknown as Block
    const conflictWithoutDestText = { sourceText: 'Y', type: 'conflict' } as unknown as Block
    const blocks: Block[] = [conflictWithoutDestText, commonWithoutDestText, conflict, commonWithoutDestText, conflictWithoutDestText]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: [], afterPreview: undefined, before: [], beforePreview: undefined })
  })
})
