import { red, strikeThrough } from 'shuutils'
import type { MergedSegment } from './char-diff'
import { at, fitLines, guessLanguage, padVisible, prepareConflictLine, renderMergedLine, stripAnsi, truncateLine, washSpans, wrapLines } from './text'

const background = { end: '<end>', start: '<start>' }

describe('merge text', () => {
  it('at reads an in-bounds slot', () => {
    expect(at(['a', 'b'], 1)).toBe('b')
  })

  it('at fails loudly rather than yielding undefined out of bounds', () => {
    expect(() => at(['a'], 3)).toThrow('index 3 should be within the 1 available items')
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

  it('wrapLines never splits a surrogate-pair character across a chunk boundary', () => {
    const chunks = wrapLines(['😀😀😀'], 2)
    expect(chunks).toStrictEqual(['😀😀', '😀'])
  })

  it('truncateLine leaves short lines untouched', () => {
    expect(truncateLine('abc', 10)).toBe('abc')
  })

  it('truncateLine cuts a long line and marks it with an ellipsis', () => {
    expect(truncateLine('abcdefghij', 5)).toBe('abcd…')
  })

  it('truncateLine never lets the result exceed the given width', () => {
    expect(truncateLine('abcdefghij', 5)).toHaveLength(5)
    expect(truncateLine('abcdefghij', 0)).toBe('')
  })

  it('truncateLine never splits a surrogate-pair character in half', () => {
    expect(Array.from(truncateLine('😀😀😀', 2))).toStrictEqual(['😀', '…'])
  })

  it('fitLines wraps when wrapping is on, and truncates when it is off', () => {
    expect(fitLines(['abcdefghij'], 4, true)).toStrictEqual(['abcd', 'efgh', 'ij'])
    expect(fitLines(['abcdefghij'], 4, false)).toStrictEqual(['abc…'])
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

  it('washSpans returns the text untouched when there is no span to wash', () => {
    expect(washSpans('abc', [], background)).toBe('abc')
  })

  it('washSpans wraps exactly the requested visible characters', () => {
    expect(washSpans('abcdef', [{ end: 4, start: 1 }], background)).toBe('a<start>bcd<end>ef')
  })

  it('washSpans washes several non-overlapping spans', () => {
    expect(
      washSpans(
        'abcdef',
        [
          { end: 2, start: 0 },
          { end: 6, start: 4 },
        ],
        background,
      ),
    ).toBe('<start>ab<end>cd<start>ef<end>')
  })

  it('washSpans closes a span that runs to the end of the text', () => {
    expect(washSpans('abc', [{ end: 9, start: 1 }], background)).toBe('a<start>bc<end>')
  })

  it('stripAnsi and padVisible ignore ansi escapes when measuring', () => {
    const colored = `[31mabc[39m`
    expect(stripAnsi(colored)).toBe('abc')
    expect(stripAnsi(padVisible(colored, 6))).toBe('abc   ')
    expect(padVisible('abcdef', 3)).toBe('abcdef')
  })

  it('washSpans counts visible characters only, skipping over ansi escapes', () => {
    const washed = washSpans(`[31mabcdef[39m`, [{ end: 3, start: 1 }], background)
    expect(stripAnsi(washed.replaceAll('<start>', '').replaceAll('<end>', ''))).toBe('abcdef')
    expect(washed).toContain('<start>bc<end>')
  })

  it('prepareConflictLine truncates to one row when wrapping is off', () => {
    const rows = prepareConflictLine('abcdefghij', { width: 5, wrapEnabled: false })
    expect(rows).toHaveLength(1)
    expect(stripAnsi(rows[0] ?? '')).toBe('abcd…')
  })

  it('prepareConflictLine wraps across rows when wrapping is on', () => {
    expect(prepareConflictLine('abcdefghij', { width: 4, wrapEnabled: true }).map(row => stripAnsi(row))).toStrictEqual(['abcd', 'efgh', 'ij'])
  })

  it('prepareConflictLine keeps the text readable for a non-positive width', () => {
    expect(prepareConflictLine('abc', { width: 0, wrapEnabled: true })).toStrictEqual(['abc'])
  })

  it('prepareConflictLine styles a deleted line instead of highlighting it', () => {
    const [row] = prepareConflictLine('abc', { deleted: true, language: 'json', width: 20, wrapEnabled: true })
    expect(row).not.toBe('abc')
    expect(stripAnsi(row ?? '')).toBe('abc')
  })

  it('prepareConflictLine leaves an empty deleted line empty', () => {
    expect(prepareConflictLine('', { deleted: true, width: 20, wrapEnabled: true })).toStrictEqual([''])
  })

  it('prepareConflictLine runs a known language through the highlighter without altering its text', () => {
    // cli-highlight emits no ansi codes outside a tty, so only the passthrough is assertable here
    expect(stripAnsi(prepareConflictLine('{ "a": 1 }', { language: 'json', width: 40, wrapEnabled: true })[0] ?? '')).toBe('{ "a": 1 }')
  })

  it('prepareConflictLine falls back to the raw line for an unknown language', () => {
    expect(prepareConflictLine('hello', { language: 'not-a-real-language', width: 40, wrapEnabled: true })).toStrictEqual(['hello'])
  })

  it('prepareConflictLine washes the changed characters of a line', () => {
    const [row] = prepareConflictLine('abcdef', { changeSpans: [{ end: 4, line: 0, start: 1 }], width: 40, wrapEnabled: true })
    expect(stripAnsi(row ?? '')).toBe('abcdef')
    expect(row).not.toBe('abcdef')
  })

  it('renderMergedLine leaves common segments plain and strikes only outgoing ones', () => {
    const segments: MergedSegment[] = [
      { kind: 'outgoing', text: 'old' },
      { kind: 'common', text: ' and ' },
      { kind: 'incoming', text: 'new' },
    ]
    const rendered = renderMergedLine(segments)
    expect(stripAnsi(rendered)).toBe('old and new')
    expect(rendered).toContain(strikeThrough(red('old')))
    expect(rendered).not.toContain(strikeThrough(red('new')))
  })

  it('prepareConflictLine renders merged segments instead of washing or fully deleting the line', () => {
    const segments: MergedSegment[] = [{ kind: 'outgoing', text: 'abc' }]
    const [row] = prepareConflictLine('abc', { changeSpans: [{ end: 3, line: 0, start: 0 }], merged: segments, width: 40, wrapEnabled: true })
    expect(row).toContain(strikeThrough(red('abc')))
  })
})
