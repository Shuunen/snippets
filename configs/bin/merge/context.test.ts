import { invariant } from 'es-toolkit'
import type { BySide } from '../types'
import { type Block, computeBlocks } from './blocks'
import { contextAround, pickContext } from './context'

const contents = (repo: string, local: string): BySide<string> => ({ local, repo })

const block = (type: Block['type'], repo: string, local: string): Block => ({ text: { local, repo }, type })

describe('merge context', () => {
  it('contextAround finds common lines on both sides of a conflict', () => {
    const blocks = computeBlocks(contents('a\nb\nc\nd', 'a\nB\nc\nd'))
    const conflict = blocks.find(item => item.type === 'conflict')
    invariant(conflict, 'expected a conflict block')
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c', 'd'], afterPreview: undefined, before: ['a'], beforePreview: undefined })
  })

  it('contextAround returns empty arrays when the conflict is at a file boundary', () => {
    const blocks = computeBlocks(contents('b\nc', 'B\nc'))
    const conflict = blocks.find(item => item.type === 'conflict')
    invariant(conflict, 'expected a conflict block')
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c'], afterPreview: undefined, before: [], beforePreview: undefined })
  })

  it('contextAround previews the next conflict once the true common context runs out', () => {
    const conflict = block('conflict', 'x', 'X')
    const blocks = [block('conflict', 'w\n', 'W\n'), block('common', 'a\n', 'a\n'), conflict, block('common', 'c\n', 'c\n'), block('conflict', 'y\n', 'Y\n')]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c'], afterPreview: ['y'], before: ['a'], beforePreview: ['w'] })
  })

  it('contextAround leaves the preview undefined when the neighboring conflict has no repo text', () => {
    const conflict = block('conflict', 'x', 'X')
    const blocks = [conflict, block('conflict', '', 'Y\n')]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: [], afterPreview: undefined, before: [], beforePreview: undefined })
  })

  it('contextAround walks through several consecutive common blocks on each side', () => {
    const conflict = block('conflict', 'x', 'X')
    const blocks = [block('common', 'a\n', 'a\n'), block('common', 'b\n', 'b\n'), conflict, block('common', 'c\n', 'c\n'), block('common', 'd\n', 'd\n')]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: ['c', 'd'], afterPreview: undefined, before: ['a', 'b'], beforePreview: undefined })
  })

  it('contextAround treats a missing repo text defensively as an empty line, both walking through it and previewing it', () => {
    const conflict = block('conflict', 'x', 'X')
    const commonWithoutRepoText = { text: { local: 'a\n' }, type: 'common' } as unknown as Block
    const conflictWithoutRepoText = { text: { local: 'Y' }, type: 'conflict' } as unknown as Block
    const blocks = [conflictWithoutRepoText, commonWithoutRepoText, conflict, commonWithoutRepoText, conflictWithoutRepoText]
    expect(contextAround(blocks, conflict)).toStrictEqual({ after: [], afterPreview: undefined, before: [], beforePreview: undefined })
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
})
