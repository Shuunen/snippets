import type { Block } from './blocks'
import { computeCharDiffSpans, resolveDisplaySpans } from './char-diff'

const makeBlock = (repo: string, local: string): Block => ({ text: { local, repo }, type: 'conflict' })

describe('merge char diff', () => {
  it('computeCharDiffSpans finds no span when both sides are identical', () => {
    expect(computeCharDiffSpans({ local: 'hello world', repo: 'hello world' })).toStrictEqual({ local: [], repo: [] })
  })

  it('computeCharDiffSpans marks only the word that changed, on each side', () => {
    const spans = computeCharDiffSpans({ local: 'hello there', repo: 'hello world' })
    expect(spans.repo).toStrictEqual([{ end: 11, line: 0, start: 6 }])
    expect(spans.local).toStrictEqual([{ end: 11, line: 0, start: 6 }])
  })

  it('computeCharDiffSpans marks an addition on the local side only', () => {
    const spans = computeCharDiffSpans({ local: 'hello big world', repo: 'hello world' })
    expect(spans.repo).toStrictEqual([])
    expect(spans.local).toHaveLength(1)
  })

  it('computeCharDiffSpans reports spans per line, resetting the column on a newline', () => {
    const spans = computeCharDiffSpans({ local: 'same\nbbb', repo: 'same\naaa' })
    expect(spans.repo).toStrictEqual([{ end: 3, line: 1, start: 0 }])
    expect(spans.local).toStrictEqual([{ end: 3, line: 1, start: 0 }])
  })

  it('computeCharDiffSpans spans every line a multi-line change touches', () => {
    const spans = computeCharDiffSpans({ local: 'xxx\nyyy', repo: 'aaa\nbbb' })
    expect(spans.repo.map(span => span.line)).toStrictEqual([0, 1])
  })

  it('computeCharDiffSpans closes a span at a trailing newline without opening an empty one after it', () => {
    const spans = computeCharDiffSpans({ local: 'x\n', repo: '' })
    expect(spans.local).toStrictEqual([{ end: 1, line: 0, start: 0 }])
    expect(spans.repo).toStrictEqual([])
  })

  it('resolveDisplaySpans keeps each side its own spans while nothing is pending', () => {
    const block = makeBlock('hello world', 'hello there')
    expect(resolveDisplaySpans(block, undefined)).toStrictEqual(computeCharDiffSpans(block.text))
  })

  it('resolveDisplaySpans shows the winning side spans on both sides once a choice is pending', () => {
    const block = makeBlock('hello world', 'hello big world')
    const shown = resolveDisplaySpans(block, 'local')
    expect(shown.repo).toStrictEqual(shown.local)
    expect(shown.local).toStrictEqual(computeCharDiffSpans(block.text).local)
  })
})
