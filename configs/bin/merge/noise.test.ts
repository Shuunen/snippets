import { buildSectionLookup, computeNoiseCutoffs, computeRuns, isNoiseLine, isNoiseWholeSide, joinRun, splitKeepingNewlines } from './noise'

describe('merge noise', () => {
  it('splitKeepingNewlines keeps each line with its trailing newline, except possibly the last', () => {
    expect(splitKeepingNewlines('a\nb\nc')).toStrictEqual(['a\n', 'b\n', 'c'])
  })

  it('splitKeepingNewlines returns an empty array for an empty string', () => {
    expect(splitKeepingNewlines('')).toStrictEqual([])
  })

  it('computeRuns groups consecutive indices sharing the same noise status into one run', () => {
    const runs = computeRuns(4, index => index < 2)
    expect(runs).toStrictEqual([
      { isNoise: true, length: 2, start: 0 },
      { isNoise: false, length: 2, start: 2 },
    ])
  })

  it('computeRuns starts a new run on every index when noise status alternates', () => {
    const runs = computeRuns(3, index => index % 2 === 0)
    expect(runs).toStrictEqual([
      { isNoise: true, length: 1, start: 0 },
      { isNoise: false, length: 1, start: 1 },
      { isNoise: true, length: 1, start: 2 },
    ])
  })

  it('joinRun reassembles the exact text a run covers', () => {
    expect(joinRun(['a\n', 'b\n', 'c'], { isNoise: false, length: 2, start: 1 })).toBe('b\nc')
  })

  it('computeNoiseCutoffs finds each side cutoff line index independently', () => {
    expect(computeNoiseCutoffs({ local: 'a\nb\n[History]', repo: 'a\n[History]\nb' }, /^\[History\]/u)).toStrictEqual({ local: 2, repo: 1 })
  })

  it('computeNoiseCutoffs returns -1 for both sides when there is no cutoff regex', () => {
    expect(computeNoiseCutoffs({ local: 'b', repo: 'a' }, undefined)).toStrictEqual({ local: -1, repo: -1 })
  })

  it('buildSectionLookup tracks the enclosing header for every line', () => {
    expect(buildSectionLookup('a\n[Foo]\nb\nc\n[Bar]\nd')).toStrictEqual(['', '[Foo]', '[Foo]', '[Foo]', '[Bar]', '[Bar]'])
  })

  it('isNoiseLine treats a blank line as noise regardless of cutoff or filters', () => {
    expect(isNoiseLine({ cutoffIndex: -1, filters: {}, line: '   ', lineIndex: 0 })).toBe(true)
  })

  it('isNoiseLine treats a line past the cutoff as noise', () => {
    expect(isNoiseLine({ cutoffIndex: 2, filters: {}, line: 'x', lineIndex: 2 })).toBe(true)
  })

  it('isNoiseLine treats a line matching removeLinesMatching as noise', () => {
    expect(isNoiseLine({ cutoffIndex: -1, filters: { removeLinesMatching: [/^LastUpdateCheck=/u] }, line: 'LastUpdateCheck=1', lineIndex: 0 })).toBe(true)
  })

  it('isNoiseLine treats a real, unfiltered line as not noise', () => {
    expect(isNoiseLine({ cutoffIndex: -1, filters: {}, line: 'x', lineIndex: 0 })).toBe(false)
  })

  it('isNoiseWholeSide is true only when every line is ignorable, and vacuously true with no lines', () => {
    expect(isNoiseWholeSide({ cutoffIndex: -1, filters: {}, lines: [], startLine: 0 })).toBe(true)
    expect(isNoiseWholeSide({ cutoffIndex: -1, filters: {}, lines: ['  ', ''], startLine: 0 })).toBe(true)
    expect(isNoiseWholeSide({ cutoffIndex: -1, filters: {}, lines: ['  ', 'x'], startLine: 0 })).toBe(false)
  })
})
