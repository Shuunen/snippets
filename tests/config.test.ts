import { check, checksRun } from 'shuutils'
import { clean, normalize, removeLinesAfter, removeLinesMatching } from '../configs/bin/utils'

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

const winHome = 'C:/Users/Johnny'
const winPath = 'C:/Users/Johnny/Projects/github/snippets/tests'

check('normalize filepath A to antislash style', normalize(winPath, undefined, undefined, winHome), 'C:\\Users\\Johnny\\Projects\\github\\snippets\\tests')
check('normalize filepath B to slash style', normalize(winPath, true, undefined, winHome), 'C:/Users/Johnny/Projects/github/snippets/tests')
check('normalize filepath C to antislash style with tilde', normalize(winPath, false, true, winHome), '~\\Projects\\github\\snippets\\tests')
check('normalize filepath D to slash style with tilde', normalize(winPath, true, true, winHome), '~/Projects/github/snippets/tests')

checksRun()
