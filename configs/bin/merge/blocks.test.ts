import type { BySide } from '../core/types'
import { applyChoices, type Block, computeBlocks, conflictsOf, linesOf } from './blocks'

const contents = (repo: string, local: string): BySide<string> => ({ local, repo })

const conflictsIn = (blocks: Block[]): Block[] => blocks.filter(block => block.type === 'conflict')

describe('merge blocks', () => {
  it('computeBlocks finds no conflict on identical content', () => {
    const blocks = computeBlocks(contents('a\nb\nc', 'a\nb\nc'))
    expect(blocks.every(block => block.type === 'common')).toBe(true)
  })

  it('computeBlocks finds a single conflict block on a changed line', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nb\nc', 'a\nB\nc')))
    expect(conflicts).toHaveLength(1)
    expect(linesOf(conflicts[0]?.text.repo ?? '')).toStrictEqual(['b'])
    expect(linesOf(conflicts[0]?.text.local ?? '')).toStrictEqual(['B'])
  })

  it('computeBlocks finds a repo-only conflict block on a removed line', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nb\nc', 'a\nc')))
    expect(conflicts).toHaveLength(1)
    expect(linesOf(conflicts[0]?.text.repo ?? '')).toStrictEqual(['b'])
    expect(conflicts[0]?.text.local).toBe('')
  })

  it('computeBlocks finds a local-only conflict block on an added line', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nc', 'a\nb\nc')))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.text.repo).toBe('')
    expect(linesOf(conflicts[0]?.text.local ?? '')).toStrictEqual(['b'])
  })

  it('computeBlocks flags a conflict as noise when every line matches removeLinesMatching on both sides', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nLastUpdateCheck=1\nc', 'a\nLastUpdateCheck=2\nc'), { removeLinesMatching: [/^LastUpdateCheck=/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks does not flag a conflict as noise when only one side matches removeLinesMatching', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nLastUpdateCheck=1\nc', 'a\nsomethingElse=2\nc'), { removeLinesMatching: [/^LastUpdateCheck=/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('computeBlocks flags a pure addition as noise when the added line matches removeLinesMatching', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nc', 'a\nLastUpdateCheck=1\nc'), { removeLinesMatching: [/^LastUpdateCheck=/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks flags a conflict as noise when it falls after a removeLinesAfter cutoff on both sides', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\n[History]\nx=1', 'a\n[History]\nx=2'), { removeLinesAfter: /^\[History\]/u }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks does not flag a conflict as noise when it falls before a removeLinesAfter cutoff', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nb\n[History]', 'a\nB\n[History]'), { removeLinesAfter: /^\[History\]/u }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('computeBlocks carves a noise line out of a multi-line addition instead of hiding the whole thing', () => {
    const conflicts = conflictsIn(computeBlocks(contents('[AddNewTorrentDialog]\nEnabled=true', '[AddNewTorrentDialog]\nAttached=false\nDialogSize=@Size(1506 769)\nEnabled=true'), { removeLinesMatching: [/@Size/u] }))
    expect(conflicts).toHaveLength(2)
    expect(linesOf(conflicts[0]?.text.local ?? '')).toStrictEqual(['Attached=false'])
    expect(conflicts[0]?.isNoise).toBe(false)
    expect(linesOf(conflicts[1]?.text.local ?? '')).toStrictEqual(['DialogSize=@Size(1506 769)'])
    expect(conflicts[1]?.isNoise).toBe(true)
  })

  it('computeBlocks keeps a differing-line-count modification as one block when it is not noise', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nb\nc', 'a\nB\nC\nc')))
    expect(conflicts).toHaveLength(1)
    expect(linesOf(conflicts[0]?.text.repo ?? '')).toStrictEqual(['b'])
    expect(linesOf(conflicts[0]?.text.local ?? '')).toStrictEqual(['B', 'C'])
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('computeBlocks flags a differing-line-count modification as noise when every line on both sides is ignorable', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nLastUpdateCheck=1\nc', 'a\nLastUpdateCheck=2\nExtra=1\nc'), { removeLinesMatching: [/^(?<key>LastUpdateCheck=|Extra=)/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks flags a conflict as noise when its text matches a removeBlocksMatching pattern', () => {
    const conflicts = conflictsIn(computeBlocks(contents('[AddNewTorrentDialog]\nEnabled=true', '[TorrentCreator]\nEnabled=true\n[AddNewTorrentDialog]\nEnabled=true'), { removeBlocksMatching: [/\[TorrentCreator\]/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks keeps a whole matching addition as one noise block, even when only part of it matches removeLinesMatching', () => {
    const repo = '[TorrentAdditionDlg]\nsave_path_history=~/Downloads\n'
    const local = `${repo}[TorrentCreator]\nComments=\nSize=@Size(592 731)\nSource=\nStartSeeding=true\n`
    const conflicts = conflictsIn(computeBlocks(contents(repo, local), { removeBlocksMatching: [/\[TorrentCreator\]/u], removeLinesMatching: [/@Size/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
    expect(conflicts[0]?.text.local).toContain('StartSeeding=true')
  })

  it('computeBlocks keeps a whole matching removal as one noise block on the repo side', () => {
    const local = '[TorrentAdditionDlg]\nsave_path_history=~/Downloads\n'
    const repo = `${local}[TorrentCreator]\nComments=\nSize=@Size(592 731)\nSource=\nStartSeeding=true\n`
    const conflicts = conflictsIn(computeBlocks(contents(repo, local), { removeBlocksMatching: [/\[TorrentCreator\]/u], removeLinesMatching: [/@Size/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
    expect(conflicts[0]?.text.repo).toContain('StartSeeding=true')
  })

  it('computeBlocks treats a modification differing only by trailing whitespace as noise, with no filters needed', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nb \nc', 'a\nb\nc')))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks excludes a change to a setting inside an existing, untouched section that matches removeBlocksMatching', () => {
    const repo = '[Preferences]\nEnabled=true\n[AddNewTorrentDialog]\nEnabled=false\n[General]\nLocale=en\n'
    const local = '[Preferences]\nEnabled=true\n[AddNewTorrentDialog]\nEnabled=true\n[General]\nLocale=en\n'
    const conflicts = conflictsIn(computeBlocks(contents(repo, local), { removeBlocksMatching: [/Dialog\]/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(true)
  })

  it('computeBlocks does not flag a conflict as noise when no removeBlocksMatching pattern matches', () => {
    const conflicts = conflictsIn(computeBlocks(contents('a\nc', 'a\nb\nc'), { removeBlocksMatching: [/\[TorrentCreator\]/u] }))
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.isNoise).toBe(false)
  })

  it('conflictsOf keeps only the conflicts a user has to decide on', () => {
    const blocks = computeBlocks(contents('a\nLastUpdateCheck=1\nc', 'a\nLastUpdateCheck=2\nC'), { removeLinesMatching: [/^LastUpdateCheck=/u] })
    expect(conflictsIn(blocks).length).toBeGreaterThan(conflictsOf(blocks).length)
    expect(conflictsOf(blocks).every(block => !block.isNoise)).toBe(true)
  })

  it('applyChoices keeps repo lines on both sides when choosing repo', () => {
    const blocks = computeBlocks(contents('a\nb\nc', 'a\nB\nc'))
    expect(applyChoices(blocks, ['repo'])).toStrictEqual({ local: 'a\nb\nc', repo: 'a\nb\nc' })
  })

  it('applyChoices keeps local lines on both sides when choosing local', () => {
    const blocks = computeBlocks(contents('a\nb\nc', 'a\nB\nc'))
    expect(applyChoices(blocks, ['local'])).toStrictEqual({ local: 'a\nB\nc', repo: 'a\nB\nc' })
  })

  it('applyChoices defaults to repo when a choice is missing', () => {
    const blocks = computeBlocks(contents('a\nb\nc', 'a\nB\nc'))
    expect(applyChoices(blocks, [])).toStrictEqual({ local: 'a\nb\nc', repo: 'a\nb\nc' })
  })

  it('applyChoices leaves a noise block untouched on each side, without consuming a choice', () => {
    const blocks = computeBlocks(contents('a\nLastUpdateCheck=1\nc', 'a\nLastUpdateCheck=2\nc'), { removeLinesMatching: [/^LastUpdateCheck=/u] })
    expect(applyChoices(blocks, [])).toStrictEqual({ local: 'a\nLastUpdateCheck=2\nc', repo: 'a\nLastUpdateCheck=1\nc' })
  })

  it('linesOf drops the trailing empty line the diff library adds', () => {
    expect(linesOf('a\nb\n')).toStrictEqual(['a', 'b'])
    expect(linesOf('')).toStrictEqual([])
  })
})
