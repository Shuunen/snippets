import { expect, it } from 'vitest'
import { clean, filename, normalizePathWithSlash, removeLinesAfter, removeLinesMatching, useUnixCarriageReturn } from './bin/utils'


const content = `
; How many days between every update check? (0=no checks)
UpdateCheckInterval=14
; Last update check
LastUpdateCheck=10/20/2022 08:59:59
[History]
; Enable/disable the access to the settings, can only be changed manually in this .ini
DisableSettings=False
`

it('remove lines matching A', () => {
  expect(removeLinesMatching(content, [/^LastUpdateCheck=/u])).toMatchInlineSnapshot(`
    "; How many days between every update check? (0=no checks)
    UpdateCheckInterval=14
    ; Last update check
    [History]
    ; Enable/disable the access to the settings, can only be changed manually in this .ini
    DisableSettings=False"
  `)
})

it('remove lines matching B', () => {
  expect(removeLinesMatching(content, [/\b=\b/u])).toMatchInlineSnapshot(`
    "; Last update check
    [History]
    ; Enable/disable the access to the settings, can only be changed manually in this .ini"
  `)
})

it('remove lines matching C should catch all', () => { expect(removeLinesMatching(content, [/^;/u, /^\[/u, /\b=\b/u])).toBe('') })

it('remove lines after A', () => {
  expect(removeLinesAfter(content, /^; Last/u)).toMatchInlineSnapshot(`
    "; How many days between every update check? (0=no checks)
    UpdateCheckInterval=14"
  `)
})

it('remove lines after B failed should return all', () => { expect(removeLinesAfter(content, /^Does not exists/u)).toBe(content.trim()) })

it('remove lines after C', () => {
  expect(removeLinesAfter(content, /^\[History\]/u)).toMatchInlineSnapshot(`
    "; How many days between every update check? (0=no checks)
    UpdateCheckInterval=14
    ; Last update check
    LastUpdateCheck=10/20/2022 08:59:59"
  `)
})

const contentGreenShot = `
; Greenshot core configuration
[Core]
RunInbackground.MS Paint=True

; Greenshot editor configuration
[Editor]
; Last used colors
; Settings for the torn edge effect.
TornEdgeEffectSettings=Darkness
`

it('clean A', () => { expect(clean(contentGreenShot, /\[Editor\]/u, [/^(?:LastCapturedRegion|LastUpdateCheck|OutputFileAsFull|Commands=)/u, /(?:MS Paint)/u])).toBe(';Greenshotcoreconfiguration[Core];Greenshoteditorconfiguration') })
it('clean B', () => { expect(clean('', /test/u, [/^test/u])).toBe('') })

const winHome = 'C:/Users/Johnny'
const winPath = 'C:/Users/Johnny/Projects/github/snippets/tests'

it('normalizePathWithSlash A', () => { expect(normalizePathWithSlash(winPath, undefined, winHome)).toBe('C:/Users/Johnny/Projects/github/snippets/tests') })
it('normalizePathWithSlash B', () => { expect(normalizePathWithSlash(winPath, undefined, winHome)).toBe('C:/Users/Johnny/Projects/github/snippets/tests') })
it('normalizePathWithSlash C', () => { expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests') })
it('normalizePathWithSlash D', () => { expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests') })
it('normalizePathWithSlash E', () => { expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests') })
it('normalizePathWithSlash F', () => { expect(normalizePathWithSlash(winPath, true, winHome)).toBe('~/Projects/github/snippets/tests') })
it('normalizePathWithSlash G', () => { expect(normalizePathWithSlash(winPath)).toBe('C:/Users/Johnny/Projects/github/snippets/tests') })
it('normalizePathWithSlash H', () => { expect(normalizePathWithSlash(winPath)).toBe('C:/Users/Johnny/Projects/github/snippets/tests') })
it('normalizePathWithSlash I', () => { expect(normalizePathWithSlash(winPath)).toBe('C:/Users/Johnny/Projects/github/snippets/tests') })
it('normalizePathWithSlash J', () => { expect(normalizePathWithSlash(winPath, true)).toBe('C:/Users/Johnny/Projects/github/snippets/tests') })

it('filename A', () => { expect(filename(winPath)).toBe('tests') })
it('filename B', () => { expect(filename('C:\\Users\\me\\file.txt')).toBe('file.txt') })
it('filename C', () => { expect(filename('file.txt')).toBe('') })
it('filename D', () => { expect(filename('file')).toBe('') })

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
