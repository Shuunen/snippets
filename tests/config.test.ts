import { expect, it } from 'vitest'
import { clean, filename, normalizePathWithSlash, removeLinesAfter, removeLinesMatching, useUnixCarriageReturn } from '../configs/bin/utils'
import { check } from './utils'


const content = `
; How many days between every update check? (0=no checks)
UpdateCheckInterval=14
; Last update check
LastUpdateCheck=10/20/2022 08:59:59
[History]
; Enable/disable the access to the settings, can only be changed manually in this .ini
DisableSettings=False
`

check('remove lines matching A', removeLinesMatching(content, [/^LastUpdateCheck=/u]), `; How many days between every update check? (0=no checks)
UpdateCheckInterval=14
; Last update check
[History]
; Enable/disable the access to the settings, can only be changed manually in this .ini
DisableSettings=False`)

check('remove lines matching B', removeLinesMatching(content, [/\b=\b/u]), `; Last update check
[History]
; Enable/disable the access to the settings, can only be changed manually in this .ini`)

check('remove lines matching C should catch all', removeLinesMatching(content, [/^;/u, /^\[/u, /\b=\b/u]), '')


check('remove lines after A', removeLinesAfter(content, /^; Last/u), `; How many days between every update check? (0=no checks)
UpdateCheckInterval=14`)

check('remove lines after B failed should return all', removeLinesAfter(content, /^Does not exists/u), content.trim())

check('remove lines after C', removeLinesAfter(content, /^\[History\]/u), `; How many days between every update check? (0=no checks)
UpdateCheckInterval=14
; Last update check
LastUpdateCheck=10/20/2022 08:59:59`)

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

check('clean A', clean(contentGreenShot, /\[Editor\]/u, [/^(?:LastCapturedRegion|LastUpdateCheck|OutputFileAsFull|Commands=)/u, /(?:MS Paint)/u]), ';Greenshotcoreconfiguration[Core];Greenshoteditorconfiguration')
check('clean B', clean('', /test/u, [/^test/u]), '')

const winHome = 'C:/Users/Johnny'
const winPath = 'C:/Users/Johnny/Projects/github/snippets/tests'

check('normalizePathWithSlash A', normalizePathWithSlash(winPath, undefined, winHome), 'C:/Users/Johnny/Projects/github/snippets/tests')
check('normalizePathWithSlash B', normalizePathWithSlash(winPath, undefined, winHome), 'C:/Users/Johnny/Projects/github/snippets/tests')
check('normalizePathWithSlash C', normalizePathWithSlash(winPath, true, winHome), '~/Projects/github/snippets/tests')
check('normalizePathWithSlash D', normalizePathWithSlash(winPath, true, winHome), '~/Projects/github/snippets/tests')
check('normalizePathWithSlash E', normalizePathWithSlash(winPath, true, winHome), '~/Projects/github/snippets/tests')
check('normalizePathWithSlash F', normalizePathWithSlash(winPath, true, winHome), '~/Projects/github/snippets/tests')
check('normalizePathWithSlash G', normalizePathWithSlash(winPath), 'C:/Users/Johnny/Projects/github/snippets/tests')
check('normalizePathWithSlash H', normalizePathWithSlash(winPath), 'C:/Users/Johnny/Projects/github/snippets/tests')
check('normalizePathWithSlash I', normalizePathWithSlash(winPath), 'C:/Users/Johnny/Projects/github/snippets/tests')
check('normalizePathWithSlash J', normalizePathWithSlash(winPath, true), 'C:/Users/Johnny/Projects/github/snippets/tests')

check('filename A', filename(winPath), 'tests')
check('filename B', filename('C:\\Users\\me\\file.txt'), 'file.txt')
check('filename C', filename('file.txt'), '')
check('filename D', filename('file'), '')

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
