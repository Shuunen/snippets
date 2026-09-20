import { invariant } from 'es-toolkit'
import { green, red, strikeThrough, yellow } from 'shuutils'
import type { BySide, FileDetails, Side, SyncFile } from '../core/types'
import { type Block, computeBlocks } from './blocks'
import { glyphs, layout } from './options'
import { boxTopLine, buildPanel, computeColumnWidths, gutterFor, shortenPath, truncateTitle } from './render'
import { stripAnsi } from './text'

const details = (filepath: string, content: string): FileDetails => ({ content, filepath, isExisting: true, modifiedAt: new Date() })

const makeFile = (repo: string, local: string): SyncFile => ({
  areEquals: false,
  filters: {},
  sides: { local: details('/home/me/.bashrc', local), repo: details('/repo/files/.bashrc', repo) },
})

const block = (repo: string, local: string): Block => ({ text: { local, repo }, type: 'conflict' })

const noModification: BySide<boolean> = { local: false, repo: false }

const panelOf = (pending: Side | undefined) => {
  const file = makeFile('a\nb\nc\n', 'a\nB\nc\n')
  const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
  const conflict = blocks.find(item => item.type === 'conflict') ?? block('b', 'B')
  return buildPanel({ blocks, file, fileIndex: 1, fileTotal: 2 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: noModification, pending, wrapEnabled: false })
}

describe('merge render', () => {
  it('computeColumnWidths splits the terminal between both boxes, borders and gap excluded', () => {
    const widths = computeColumnWidths(100)
    expect(widths.repo + widths.local).toBe(100 - layout.gapWidth - layout.perBoxBorderWidth * 2)
  })

  it('computeColumnWidths gives the odd column to the local side', () => {
    const widths = computeColumnWidths(101)
    expect(widths.local - widths.repo).toBe(1)
  })

  it('computeColumnWidths never goes below the minimum column width', () => {
    const widths = computeColumnWidths(10)
    expect(widths.repo).toBe(layout.minColumnWidth)
    expect(widths.local).toBe(layout.minColumnWidth)
  })

  it('shortenPath replaces the home directory with a tilde, and leaves other paths alone', () => {
    expect(shortenPath(`${process.env.HOME ?? ''}/some/file`)).toBe('~/some/file')
    expect(shortenPath('/etc/hosts')).toBe('/etc/hosts')
  })

  it('truncateTitle keeps a short title untouched', () => {
    expect(truncateTitle('~/.bashrc', 30)).toBe('~/.bashrc')
  })

  it('truncateTitle elides the middle, keeping both ends visible', () => {
    const truncated = truncateTitle('~/very/long/path/to/some/file.json', 20)
    expect(truncated).toHaveLength(20)
    expect(truncated.startsWith('~/very')).toBe(true)
    expect(truncated.endsWith('file.json')).toBe(true)
  })

  it('truncateTitle degrades to a plain cut for an unusably small width', () => {
    expect(truncateTitle('~/.bashrc', 1)).toBe('~')
    expect(truncateTitle('~/.bashrc', 0)).toBe('')
  })

  it('boxTopLine embeds the title and fills the rest of the width', () => {
    const line = boxTopLine('~/.bashrc', 40, { isHighlighted: false, isModified: false })
    expect(stripAnsi(line)).toHaveLength(40 + layout.perBoxBorderWidth)
    expect(line).toContain('~/.bashrc')
  })

  it('boxTopLine marks a box that something in this session would overwrite', () => {
    expect(boxTopLine('~/.bashrc', 40, { isHighlighted: false, isModified: true })).toContain('(modified)')
  })

  it('boxTopLine colors the box that is the pending choice', () => {
    const plain = boxTopLine('~/.bashrc', 40, { isHighlighted: false, isModified: false })
    const highlighted = boxTopLine('~/.bashrc', 40, { isHighlighted: true, isModified: false })
    expect(highlighted).not.toBe(plain)
    expect(stripAnsi(highlighted)).toBe(plain)
  })

  it('gutterFor marks an addition on the live side only, while nothing is chosen', () => {
    expect(stripAnsi(gutterFor('repo', 'addition', undefined)).trim()).toBe('')
    expect(stripAnsi(gutterFor('local', 'addition', undefined)).trim()).not.toBe('')
  })

  it('gutterFor marks a modification on both sides', () => {
    expect(stripAnsi(gutterFor('repo', 'modification', undefined)).trim()).not.toBe('')
    expect(stripAnsi(gutterFor('local', 'modification', undefined)).trim()).not.toBe('')
  })

  it('gutterFor follows the overwritten side once a choice is pending', () => {
    expect(stripAnsi(gutterFor('repo', 'removal', 'local')).trim()).not.toBe('')
    expect(stripAnsi(gutterFor('local', 'removal', 'local')).trim()).toBe('')
  })

  it('gutterFor leaves a row nothing happens to unmarked', () => {
    expect(stripAnsi(gutterFor('repo', undefined, 'local')).trim()).toBe('')
    expect(stripAnsi(gutterFor('local', undefined, undefined)).trim()).toBe('')
  })

  it('gutterFor colors each kind differently, so the bar reads as the impact', () => {
    const marks = (['addition', 'modification', 'removal'] as const).map(kind => gutterFor('local', kind, undefined))
    expect(new Set(marks)).toHaveLength(3)
  })

  it('buildPanel opens with the file/block counter and closes with the hint rows', () => {
    const panel = panelOf(undefined)
    expect(stripAnsi(panel[0] ?? '')).toContain('file 1/2')
    expect(stripAnsi(panel[0] ?? '')).toContain('block 1/1')
    expect(stripAnsi(panel.at(-1) ?? '')).toContain('abort everything')
  })

  it('buildPanel titles each box with its own path', () => {
    const panel = panelOf(undefined).map(row => stripAnsi(row))
    expect(panel.some(row => row.includes('/repo/files/.bashrc'))).toBe(true)
    expect(panel.some(row => row.includes('/home/me/.bashrc'))).toBe(true)
  })

  it('buildPanel shows both sides of the conflict while nothing is chosen', () => {
    const panel = panelOf(undefined).map(row => stripAnsi(row))
    expect(panel.some(row => row.includes('│') && row.includes('b') && row.includes('B'))).toBe(true)
  })

  it('buildPanel keeps showing the overwritten side its own word, struck through, once a choice is pending', () => {
    const rows = panelOf('repo')
    const strippedRows = rows.map(row => stripAnsi(row))
    expect(strippedRows.some(row => row.includes('B'))).toBe(true)
    const overwrittenRow = rows.find(row => stripAnsi(row).includes('B'))
    invariant(overwrittenRow, 'the overwritten word should still be on screen')
    expect(overwrittenRow).toContain(strikeThrough(red('B')))
  })

  it('buildPanel keeps the gutter and arrow yellow on a same-length modification even while the overwritten word is struck through', () => {
    const rows = panelOf('repo')
    const overwrittenRow = rows.find(row => stripAnsi(row).includes('B'))
    invariant(overwrittenRow, 'the overwritten row should be on screen')
    expect(overwrittenRow).toContain(yellow(glyphs.gutterBar))
    expect(overwrittenRow).toContain(yellow(glyphs.arrowToRight))
    expect(overwrittenRow).not.toContain(red(glyphs.gutterBar))
  })

  it('buildPanel still previews the incoming word, plain, on the side being overwritten, right after its own struck word', () => {
    const rows = panelOf('local')
    const strippedRows = rows.map(row => stripAnsi(row))
    const overwrittenRow = rows.find(row => stripAnsi(row).includes('b') && stripAnsi(row).includes('B'))
    invariant(overwrittenRow, 'the overwritten row should show both its own word and the word taking its place')
    expect(overwrittenRow).toContain(strikeThrough(red('b')))
    expect(strippedRows.some(row => row.includes('B'))).toBe(true)
  })

  it('buildPanel strikes through the surplus line a shrinking modification would drop', () => {
    const file = makeFile('{\n  "voiceEnabled": false\n}\n', '{\n  "voiceEnabled": false,\n  "model": "opus"\n}\n')
    const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
    const conflict = blocks.find(item => item.type === 'conflict') ?? block('b', 'B')
    const panel = buildPanel({ blocks, file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: { local: true, repo: false }, pending: 'repo', wrapEnabled: false })
    const dropped = panel.find(row => stripAnsi(row).includes('"model"'))
    expect(dropped).toBeDefined()
    invariant(dropped, 'the dropped line should still be on screen rather than vanish')
    expect(dropped).toContain(strikeThrough(red('  "model": "opus"')))
  })

  it('buildPanel leaves a growing modification unstruck, since it drops nothing', () => {
    const file = makeFile('{\n  "voiceEnabled": false\n}\n', '{\n  "voiceEnabled": false,\n  "model": "opus"\n}\n')
    const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
    const conflict = blocks.find(item => item.type === 'conflict') ?? block('b', 'B')
    const panel = buildPanel({ blocks, file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: { local: false, repo: true }, pending: 'local', wrapEnabled: false })
    const kept = panel.find(row => stripAnsi(row).includes('"model"'))
    invariant(kept, 'the incoming line should be previewed on both sides')
    expect(kept).not.toContain(strikeThrough(red('  "model": "opus"')))
  })

  it('buildPanel colors the dropped row red and the swapped row yellow, gutter and arrow alike', () => {
    const file = makeFile('{\n  "voiceEnabled": false\n}\n', '{\n  "voiceEnabled": false,\n  "model": "opus"\n}\n')
    const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
    const conflict = blocks.find(item => item.type === 'conflict') ?? block('b', 'B')
    const panel = buildPanel({ blocks, file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: { local: true, repo: false }, pending: 'repo', wrapEnabled: false })
    const swapped = panel.find(row => stripAnsi(row).includes('voiceEnabled'))
    const droppedRow = panel.find(row => stripAnsi(row).includes('"model"'))
    invariant(swapped && droppedRow, 'both rows should be on screen')
    expect(swapped).toContain(yellow(glyphs.gutterBar))
    expect(swapped).toContain(yellow(glyphs.arrowToRight))
    expect(droppedRow).toContain(red(glyphs.gutterBar))
    expect(droppedRow).toContain(red(glyphs.arrowToRight))
    expect(droppedRow).not.toContain(yellow(glyphs.gutterBar))
  })

  it('buildPanel colors the gained row green when the choice adds a line', () => {
    const file = makeFile('{\n  "voiceEnabled": false\n}\n', '{\n  "voiceEnabled": false,\n  "model": "opus"\n}\n')
    const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
    const conflict = blocks.find(item => item.type === 'conflict') ?? block('b', 'B')
    const panel = buildPanel({ blocks, file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: { local: false, repo: true }, pending: 'local', wrapEnabled: false })
    const gained = panel.find(row => stripAnsi(row).includes('"model"'))
    invariant(gained, 'the gained row should be on screen')
    expect(gained).toContain(green(glyphs.gutterBar))
    expect(gained).toContain(green(glyphs.arrowToLeft))
  })

  it('buildPanel falls back to the block kind for a row the pending choice leaves untouched', () => {
    const file = makeFile('same\n', 'same\ntwo\n')
    const conflict = block('same\n', 'same\ntwo\n')
    const panel = buildPanel({ blocks: [conflict], file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: { local: true, repo: false }, pending: 'repo', wrapEnabled: false })
    const untouched = panel.find(row => stripAnsi(row).includes('same'))
    invariant(untouched, 'the untouched row should still be drawn')
    expect(stripAnsi(untouched)).toContain(glyphs.arrowToRight)
    expect(untouched).not.toContain(green(glyphs.gutterBar))
  })

  it('buildPanel keeps the two boxes aligned when a line wraps on one side only', () => {
    const long = `x${'y'.repeat(200)}`
    const file = makeFile('a\n', `${long}\n`)
    const conflict = block('a\n', `${long}\n`)
    const panel = buildPanel({ blocks: [conflict], file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: noModification, pending: undefined, wrapEnabled: true })
    const wrapped = panel.filter(row => stripAnsi(row).includes('yyy'))
    expect(wrapped.length).toBeGreaterThan(1)
    expect(
      new Set(
        panel
          .slice(2)
          .filter(row => stripAnsi(row).trim() !== '')
          .map(row => stripAnsi(row).length),
      ),
    ).toHaveLength(1)
  })

  it('buildPanel keeps the two boxes aligned whichever side holds the long line', () => {
    const long = `x${'y'.repeat(200)}`
    const file = makeFile(`${long}\n`, 'a\n')
    const conflict = block(`${long}\n`, 'a\n')
    const panel = buildPanel({ blocks: [conflict], file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: noModification, pending: undefined, wrapEnabled: true })
    expect(panel.filter(row => stripAnsi(row).includes('yyy')).length).toBeGreaterThan(1)
    expect(
      new Set(
        panel
          .slice(2)
          .filter(row => stripAnsi(row).trim() !== '')
          .map(row => stripAnsi(row).length),
      ),
    ).toHaveLength(1)
  })

  it('buildPanel keeps every row of the panel body the same width, so nothing is ragged', () => {
    const body = panelOf(undefined)
      .slice(2)
      .filter(row => stripAnsi(row).trim() !== '')
    expect(new Set(body.map(row => stripAnsi(row).length))).toHaveLength(1)
  })

  it('buildPanel leaves the repo side blank on a pure addition, while nothing is chosen', () => {
    const file = makeFile('a\nc\n', 'a\nb\nc\n')
    const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
    const conflict = blocks.find(item => item.type === 'conflict') ?? block('', 'b')
    const panel = buildPanel({ blocks, file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: noModification, pending: undefined, wrapEnabled: false })
    const conflictRow = panel.map(row => stripAnsi(row)).find(row => row.includes('?'))
    expect(conflictRow).toContain('b')
  })

  it('buildPanel leaves the local side blank on a pure removal, while nothing is chosen', () => {
    const file = makeFile('a\nb\nc\n', 'a\nc\n')
    const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
    const conflict = blocks.find(item => item.type === 'conflict') ?? block('b', '')
    const panel = buildPanel({ blocks, file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: noModification, pending: undefined, wrapEnabled: false })
    const conflictRow = panel.map(row => stripAnsi(row)).find(row => row.includes('?'))
    expect(conflictRow).toContain('b')
  })

  it('buildPanel renders a pure addition, leaving the repo side empty', () => {
    const file = makeFile('a\nc\n', 'a\nb\nc\n')
    const blocks = computeBlocks({ local: file.sides.local.content, repo: file.sides.repo.content })
    const conflict = blocks.find(item => item.type === 'conflict') ?? block('', 'b')
    const panel = buildPanel({ blocks, file, fileIndex: 1, fileTotal: 1 }, { block: conflict, blockIndex: 1, blockTotal: 1, modified: { local: true, repo: false }, pending: 'local', wrapEnabled: true })
    expect(panel.some(row => stripAnsi(row).includes('(modified)'))).toBe(true)
  })
})
