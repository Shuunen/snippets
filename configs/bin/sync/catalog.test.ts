import { homeDir } from './catalog'

describe('sync catalog', () => {
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
