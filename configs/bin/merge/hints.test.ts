import { buildHints, spaceBetween } from './hints'
import { stripAnsi } from './text'

describe('merge hints', () => {
  it('spaceBetween has nothing to space out with fewer than two parts', () => {
    expect(spaceBetween(['only'], 80)).toBe('only')
    expect(spaceBetween([], 80)).toBe('')
  })

  it('spaceBetween spreads the slack evenly, giving the remainder to the leftmost gaps', () => {
    expect(spaceBetween(['a', 'b', 'c'], 10)).toBe('a    b   c')
  })

  it('buildHints returns a divider spanning the width, then the two hint rows', () => {
    const [divider, ...rows] = buildHints(80, false)
    expect(stripAnsi(divider ?? '')).toHaveLength(80)
    expect(rows).toHaveLength(2)
  })

  it('buildHints spans each row across the full width, like space-between', () => {
    for (const row of buildHints(80, false).slice(1)) expect(stripAnsi(row).length).toBeGreaterThanOrEqual(80)
  })

  it('buildHints aligns both rows on the same columns', () => {
    const [, primary, secondary] = buildHints(100, false)
    expect(stripAnsi(primary ?? '').indexOf('confirm')).toBeGreaterThan(0)
    expect(stripAnsi(primary ?? '')).toHaveLength(stripAnsi(secondary ?? '').length)
  })

  it('buildHints keeps a minimum gap between columns when the width is too small to space them out', () => {
    const [, primary] = buildHints(1, false)
    expect(stripAnsi(primary ?? '').length).toBeGreaterThan(1)
  })

  it('buildHints reflects the current wrap state in its label', () => {
    expect(stripAnsi(buildHints(80, false)[2] ?? '')).toContain('wrap text')
    expect(stripAnsi(buildHints(80, true)[2] ?? '')).toContain('un-wrap text')
  })
})
