import { buildSectionLookup, computeNoiseCutoffs, computeRuns, isNoiseLine, splitKeepingNewlines } from './merge-noise.node'

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

  it('computeNoiseCutoffs finds each side cutoff line index independently', () => {
    expect(computeNoiseCutoffs('a\n[History]\nb', 'a\nb\n[History]', /^\[History\]/u)).toStrictEqual({ destCutoff: 1, sourceCutoff: 2 })
  })

  it('computeNoiseCutoffs returns -1 for both sides when there is no cutoff regex', () => {
    expect(computeNoiseCutoffs('a', 'b', undefined)).toStrictEqual({ destCutoff: -1, sourceCutoff: -1 })
  })

  it('buildSectionLookup tracks the enclosing header for every line', () => {
    expect(buildSectionLookup('a\n[Foo]\nb\nc\n[Bar]\nd')).toStrictEqual(['', '[Foo]', '[Foo]', '[Foo]', '[Bar]', '[Bar]'])
  })

  it('isNoiseLine treats a blank line as noise regardless of cutoff or filters', () => {
    expect(isNoiseLine({ cutoffIndex: -1, line: '   ', lineIndex: 0, removeLinesMatching: undefined })).toBe(true)
  })

  it('isNoiseLine treats a line past the cutoff as noise', () => {
    expect(isNoiseLine({ cutoffIndex: 2, line: 'x', lineIndex: 2, removeLinesMatching: undefined })).toBe(true)
  })

  it('isNoiseLine treats a line matching removeLinesMatching as noise', () => {
    expect(isNoiseLine({ cutoffIndex: -1, line: 'LastUpdateCheck=1', lineIndex: 0, removeLinesMatching: [/^LastUpdateCheck=/u] })).toBe(true)
  })

  it('isNoiseLine treats a real, unfiltered line as not noise', () => {
    expect(isNoiseLine({ cutoffIndex: -1, line: 'x', lineIndex: 0, removeLinesMatching: undefined })).toBe(false)
  })
})
