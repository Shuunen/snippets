import { at, homeDir } from './utils'

describe('utils', () => {
  it('at reads an in-bounds slot', () => {
    expect(at(['a', 'b'], 1)).toBe('b')
  })

  it('at fails loudly rather than yielding undefined out of bounds', () => {
    expect(() => at(['a'], 3)).toThrow('index 3 should be within the 1 available items')
  })

  it('homeDir reports the home directory from the environment', () => {
    expect(homeDir()).toBe(process.env.HOME)
  })

  it('homeDir falls back to an empty string when the environment does not say', () => {
    const previous = process.env.HOME
    delete process.env.HOME
    try {
      expect(homeDir()).toBe('')
    } finally {
      process.env.HOME = previous
    }
  })
})
