import { computeCharDiffSpans, computeMergedLineSegments } from './char-diff'

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

  it('computeMergedLineSegments marks an entirely different word as outgoing then incoming', () => {
    expect(computeMergedLineSegments('b', 'B')).toStrictEqual([
      { kind: 'outgoing', text: 'b' },
      { kind: 'incoming', text: 'B' },
    ])
  })

  it('computeMergedLineSegments keeps the shared prefix common and marks only the trailing comma outgoing', () => {
    expect(computeMergedLineSegments('  "voiceEnabled": false,', '  "voiceEnabled": false')).toStrictEqual([
      { kind: 'common', text: '  "voiceEnabled": false' },
      { kind: 'outgoing', text: ',' },
    ])
  })

  it('computeMergedLineSegments marks an added trailing comma incoming, nothing outgoing', () => {
    expect(computeMergedLineSegments('  "voiceEnabled": false', '  "voiceEnabled": false,')).toStrictEqual([
      { kind: 'common', text: '  "voiceEnabled": false' },
      { kind: 'incoming', text: ',' },
    ])
  })

  it('computeMergedLineSegments finds only a common segment when both lines are identical', () => {
    expect(computeMergedLineSegments('same', 'same')).toStrictEqual([{ kind: 'common', text: 'same' }])
  })
})
