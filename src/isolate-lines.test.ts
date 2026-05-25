import { isolateLines, linesToList } from './isolate-lines.utils'

describe('isolate-lines', () => {
  it('isolateLines A should process complex input with duplicates and spaces', () => {
    expect(isolateLines('xyz\nudp://9.7zip.t0:2750  xyz  \n \n \n http://ubuntu.com:80/announce  \n  ab-cd\n\n  ab-cd ')).toMatchInlineSnapshot(`
      [
        "ab-cd",
        "http://ubuntu.com:80/announce",
        "udp://9.7zip.t0:2750xyz",
        "xyz",
      ]
    `)
  })

  it('isolateLines B should return empty array for empty string', () => {
    expect(isolateLines('')).toMatchInlineSnapshot(`[]`)
  })

  it('isolateLines C should return empty array for whitespace only', () => {
    expect(isolateLines('  ')).toMatchInlineSnapshot(`[]`)
  })

  it('isolateLines D should return empty array for newlines and spaces', () => {
    expect(isolateLines('  \n  ')).toMatchInlineSnapshot(`[]`)
  })

  it('isolateLines E should return empty array for multiple newlines and spaces', () => {
    expect(isolateLines('  \n  \n  ')).toMatchInlineSnapshot(`[]`)
  })

  it('isolateLines F should extract single line with spaces around', () => {
    expect(isolateLines('  \nxyz  \n  \n  ')).toMatchInlineSnapshot(`
      [
        "xyz",
      ]
    `)
  })

  it('isolateLines G should remove all spaces from lines', () => {
    expect(isolateLines('h e l l o\nw o r l d')).toMatchInlineSnapshot(`
      [
        "hello",
        "world",
      ]
    `)
  })

  it('isolateLines H should sort lines alphabetically', () => {
    expect(isolateLines('zebra\napple\nbanana')).toMatchInlineSnapshot(`
      [
        "apple",
        "banana",
        "zebra",
      ]
    `)
  })

  it('isolateLines I should handle single line input', () => {
    expect(isolateLines('single-line')).toMatchInlineSnapshot(`
      [
        "single-line",
      ]
    `)
  })

  it('linesToList A should convert array to string with double newlines', () => {
    expect(linesToList(['line1', 'line2', 'line3'])).toMatchInlineSnapshot(`"line1

line2

line3"`)
  })

  it('linesToList B should handle empty array', () => {
    expect(linesToList([])).toMatchInlineSnapshot(`""`)
  })

  it('linesToList C should handle single line array', () => {
    expect(linesToList(['single'])).toMatchInlineSnapshot(`"single"`)
  })

  it('linesToList D should handle lines with spaces', () => {
    expect(linesToList(['  spaced  ', '  content  '])).toMatchInlineSnapshot(`
      "spaced

      content"
    `)
  })
})
