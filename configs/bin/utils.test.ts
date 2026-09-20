import { filename, normalizePathWithSlash, useUnixCarriageReturn } from './utils.node'

describe('config utils', () => {
  const winHome = 'C:/Users/Johnny'
  const winPath = 'C:/Users/Johnny/Projects/github/snippets/tests'

  it('normalizePathWithSlash A', () => {
    expect(normalizePathWithSlash(winPath, undefined, winHome)).toBe('C:/Users/Johnny/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash B', () => {
    expect(normalizePathWithSlash(winPath, undefined, winHome)).toBe('C:/Users/Johnny/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash C', () => {
    expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash D', () => {
    expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash E', () => {
    expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash F', () => {
    expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash G', () => {
    expect(normalizePathWithSlash(winPath)).toBe('C:/Users/Johnny/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash H', () => {
    expect(normalizePathWithSlash(winPath)).toBe('C:/Users/Johnny/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash I', () => {
    expect(normalizePathWithSlash(winPath)).toBe('C:/Users/Johnny/Projects/github/snippets/tests')
  })

  it('normalizePathWithSlash J', () => {
    expect(normalizePathWithSlash(winPath, true)).toBe('C:/Users/Johnny/Projects/github/snippets/tests')
  })

  it('filename A', () => {
    expect(filename(winPath)).toBe('tests')
  })

  it('filename B', () => {
    expect(filename(String.raw`C:\Users\me\file.txt`)).toBe('file.txt')
  })

  it('filename C', () => {
    expect(filename('file.txt')).toBe('')
  })

  it('filename D', () => {
    expect(filename('file')).toBe('')
  })

  it('useUnixCarriageReturn A', () => {
    expect(useUnixCarriageReturn('a\nb\nc')).toMatchInlineSnapshot(`
    "a
    b
    c"
  `)
  })

  it('useUnixCarriageReturn B', () => {
    expect(useUnixCarriageReturn('a\r\nb\nc')).toMatchInlineSnapshot(`
    "a
    b
    c"
  `)
  })
})
