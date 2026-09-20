import { colors, gap, getSecondaryHints, layout, primaryHints, retryActions } from './options'
import { stripAnsi } from './text'

describe('merge options', () => {
  it('gap is as wide as the layout says', () => {
    expect(gap).toHaveLength(layout.gapWidth)
  })

  it('every color leaves the text itself untouched', () => {
    for (const color of Object.values(colors)) expect(stripAnsi(color('abc'))).toBe('abc')
  })

  it('the secondary hints describe the wrap toggle by what pressing it would do', () => {
    expect(getSecondaryHints(false).find(hint => hint.key === 'w')?.description).toBe('wrap text')
    expect(getSecondaryHints(true).find(hint => hint.key === 'w')?.description).toBe('un-wrap text')
  })

  it('both hint rows hold the same number of columns, so they can be aligned', () => {
    expect(getSecondaryHints(false)).toHaveLength(primaryHints.length)
  })

  it('the retry actions cover abort, retry and skip', () => {
    expect(retryActions.map(action => action.name)).toStrictEqual(['abort', 'retry', 'skip'])
  })
})
