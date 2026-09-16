// oxlint-disable typescript/no-explicit-any
import { invariant, noop } from 'es-toolkit'
import { daysAgoIso10 } from 'shuutils'
import { millions, rollingWindow, short, windowSavingsPct } from './token-saved.utils'

const mockSpawnSync = vi.fn<() => any>()
const mockReadFileSync = vi.fn<() => any>()
const mockStatSync = vi.fn<() => any>()

vi.mock(import('node:child_process'), () => ({
  spawnSync: mockSpawnSync,
}))

vi.mock(import('node:fs'), () => ({
  readFileSync: mockReadFileSync,
  statSync: mockStatSync,
}))

const {
  binaryPath,
  buildHeadroomRow,
  buildRtkRow,
  collectHeadroom,
  collectPonytail,
  collectRtk,
  headers,
  isPonytailEnabled,
  isProxyHealthy,
  isRtkWired,
  logger,
  missingRow,
  pad,
  renderTable,
  runJson,
  start,
  updatedOn,
  updatedOnFile,
  versionOf,
} = await import('./token-saved.cli')

const rtkReport = {
  daily: [
    { date: daysAgoIso10(0), input_tokens: 5000, saved_tokens: 1000 },
    { date: daysAgoIso10(3), input_tokens: 8000, saved_tokens: 2000 },
    { date: daysAgoIso10(20), input_tokens: 10_000, saved_tokens: 4000 },
    { date: daysAgoIso10(60), input_tokens: 20_000, saved_tokens: 8000 },
  ],
  summary: { total_commands: 42 },
}

const ponytailManifest = JSON.stringify({ name: 'ponytail', version: '4.9.0' })
const enabledSettings = JSON.stringify({ enabledPlugins: { 'ponytail@ponytail': true } })
/** Both savers wired : the rtk PreToolUse hook and the ponytail plugin */
const activeSettings = JSON.stringify({ enabledPlugins: { 'ponytail@ponytail': true }, hooks: { PreToolUse: [{ hooks: [{ command: '$HOME/.local/bin/rtk hook claude' }] }] } })

const headroomReport = {
  lifetime: { calls: 12 },
  windows: {
    last_30_days: { savings_percent: 16.4, tokens_saved: 3_139_318 },
    last_7_days: { savings_percent: 18.2, tokens_saved: 2_000_000 },
    today: { savings_percent: 20.8, tokens_saved: 94_092 },
  },
}

/**
 * Build a fake spawnSync return
 * @param overrides the fields to override
 * @returns a spawnSync-like object
 */
function spawnResult(overrides: Record<string, unknown> = {}) {
  return { error: undefined, status: 0, stderr: '', stdout: '', ...overrides }
}

/**
 * Queue the two reads collectPonytail does, in order : its plugin manifest, then the settings
 * @param settings the settings payload
 */
function mockPonytailReads(settings = enabledSettings) {
  mockReadFileSync.mockReturnValueOnce(ponytailManifest).mockReturnValueOnce(settings)
}

beforeEach(() => {
  vi.restoreAllMocks()
  mockSpawnSync.mockReset()
  mockReadFileSync.mockReset()
  mockStatSync.mockReset()
  logger.inMemoryLogs.length = 0
})

describe('millions', () => {
  it('millions A drops the useless decimal', () => {
    expect(millions(32_000_000)).toBe('32 millions')
  })

  it('millions B uses a comma as decimal separator', () => {
    expect(millions(600_000)).toBe('0,6 millions')
  })

  it('millions C rounds to one decimal', () => {
    expect(millions(3_139_318)).toBe('3,1 millions')
  })

  it('millions D handles zero', () => {
    expect(millions(0)).toBe('0 millions')
  })
})

describe('short', () => {
  it('short A keeps small counts as is', () => {
    expect(short(59)).toBe('59')
  })

  it('short B uses the thousand unit', () => {
    expect(short(72_034)).toBe('72k')
  })

  it('short C uses the million unit with a comma', () => {
    expect(short(1_061_269)).toBe('1,1M')
  })

  it('short D drops the useless decimal', () => {
    expect(short(2_000_000)).toBe('2M')
  })

  it('short E uses the billion unit', () => {
    expect(short(3_500_000_000)).toBe('3,5G')
  })

  it('short F handles negative counts', () => {
    expect(short(-4200)).toBe('-4,2k')
  })
})

describe('rollingWindow', () => {
  it('rollingWindow A sums today only', () => {
    expect(rollingWindow(rtkReport.daily, 1)).toBe(1000)
  })

  it('rollingWindow B sums the last seven days, inclusive', () => {
    expect(rollingWindow(rtkReport.daily, 7)).toBe(3000)
  })

  it('rollingWindow C sums the last thirty days, inclusive', () => {
    expect(rollingWindow(rtkReport.daily, 30)).toBe(7000)
  })

  it('rollingWindow D returns zero on an empty ledger', () => {
    expect(rollingWindow([], 30)).toBe(0)
  })

  it('rollingWindow E ignores future dated rows coming from clock skew', () => {
    const skewed = [...rtkReport.daily, { date: daysAgoIso10(-2), input_tokens: 9999, saved_tokens: 500_000 }]
    expect(rollingWindow(skewed, 1)).toBe(1000)
    expect(rollingWindow(skewed, 30)).toBe(7000)
  })
})

describe('windowSavingsPct', () => {
  it('windowSavingsPct A ratios today only', () => {
    expect(windowSavingsPct(rtkReport.daily, 1)).toBe(20)
  })

  it('windowSavingsPct B ratios the window and not the lifetime', () => {
    expect(windowSavingsPct(rtkReport.daily, 30)).toBeCloseTo(30.43)
  })

  it('windowSavingsPct C returns zero when nothing went through', () => {
    expect(windowSavingsPct([], 30)).toBe(0)
  })

  it('windowSavingsPct D returns zero rather than dividing by zero', () => {
    expect(windowSavingsPct([{ date: daysAgoIso10(0), input_tokens: 0, saved_tokens: 0 }], 1)).toBe(0)
  })
})

describe('runJson', () => {
  it('runJson A returns the parsed payload', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: '{"count":42}' }))
    const result = runJson<{ count: number }>('rtk', ['gain'])
    invariant(result.ok, 'result should be ok')
    expect(result.value.count).toBe(42)
  })

  it('runJson B fails when the binary is missing', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ error: new Error('ENOENT') }))
    const result = runJson('rtk', ['gain'])
    expect(result.ok).toBe(false)
  })

  it('runJson C fails when the output is not json', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'not json at all' }))
    const result = runJson('rtk', ['gain'])
    expect(result.ok).toBe(false)
  })

  it('runJson D fails when spawn throws', () => {
    mockSpawnSync.mockImplementation(() => {
      throw new Error('boom')
    })
    const result = runJson('rtk', ['gain'])
    expect(result.ok).toBe(false)
  })

  it('runJson E fails on a non zero exit even with json on stdout', () => {
    // rtk still prints a payload while exiting 1, parsing it would report stale numbers as fresh
    mockSpawnSync.mockReturnValue(spawnResult({ status: 1, stdout: '{"count":42}' }))
    const result = runJson<{ count: number }>('rtk', ['gain'])
    expect(result.ok).toBe(false)
  })
})

describe('binaryPath', () => {
  it('binaryPath A returns the first match', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: '/home/user/.local/bin/rtk\n/usr/bin/rtk\n' }))
    const result = binaryPath('rtk')
    invariant(result.ok, 'result should be ok')
    expect(result.value).toBe('/home/user/.local/bin/rtk')
  })

  it('binaryPath B fails on a non zero status', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ status: 1 }))
    expect(binaryPath('nope').ok).toBe(false)
  })

  it('binaryPath C fails on an empty output', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: '   ' }))
    expect(binaryPath('nope').ok).toBe(false)
  })

  it('binaryPath D asks windows where instead of which', () => {
    const commands: string[] = []
    mockSpawnSync.mockImplementation((...args: unknown[]) => {
      commands.push(String(args[0]))
      return spawnResult({ stdout: 'C:\\Users\\me\\rtk.exe' })
    })
    const { platform } = process
    Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' })
    const result = binaryPath('rtk')
    Object.defineProperty(process, 'platform', { configurable: true, value: platform })
    invariant(result.ok, 'result should be ok')
    expect(commands).toStrictEqual(['where'])
  })

  it('binaryPath E drops the carriage return windows where appends', () => {
    // where separates its matches with CRLF, splitting on \n alone would keep a trailing \r in the path
    const first = String.raw`C:\bin\rtk.exe`
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: `${first}\r\nC:\\other\\rtk.exe\r\n` }))
    const result = binaryPath('rtk')
    invariant(result.ok, 'result should be ok')
    expect(result.value).toBe(first)
  })
})

describe('versionOf', () => {
  it('versionOf A takes the last token', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'headroom, version 0.37.0\n' }))
    expect(versionOf('headroom')).toBe('0.37.0')
  })

  it('versionOf B returns a dash when the tool is missing', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ error: new Error('ENOENT') }))
    expect(versionOf('headroom')).toBe('-')
  })

  it('versionOf C returns a dash on an empty output', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: '' }))
    expect(versionOf('headroom')).toBe('-')
  })
})

describe('updatedOn', () => {
  it('updatedOn A returns the binary modification date', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: '/usr/bin/rtk\n' }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    expect(updatedOn('rtk')).toBe('2026-09-10')
  })

  it('updatedOn B returns a dash when the binary is not found', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ status: 1 }))
    expect(updatedOn('rtk')).toBe('-')
  })

  it('updatedOn C returns a dash when the stat fails', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: '/usr/bin/rtk\n' }))
    mockStatSync.mockImplementation(() => {
      throw new Error('nope')
    })
    expect(updatedOn('rtk')).toBe('-')
  })
})

describe('isRtkWired', () => {
  it('isRtkWired A detects the registered hook', () => {
    mockReadFileSync.mockReturnValue('{"hooks":{"PreToolUse":[{"command":"$HOME/.local/bin/rtk hook claude"}]}}')
    expect(isRtkWired()).toBe(true)
  })

  it('isRtkWired B returns false without the hook', () => {
    mockReadFileSync.mockReturnValue('{"hooks":{}}')
    expect(isRtkWired()).toBe(false)
  })

  it('isRtkWired C returns false when the settings cannot be read', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    expect(isRtkWired()).toBe(false)
  })
})

describe('isProxyHealthy', () => {
  it('isProxyHealthy A is true when the proxy answers healthy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: () => Promise.resolve({ status: 'healthy' }), ok: true } as never)
    await expect(isProxyHealthy()).resolves.toBe(true)
  })

  it('isProxyHealthy B is false on another status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: () => Promise.resolve({ status: 'starting' }), ok: true } as never)
    await expect(isProxyHealthy()).resolves.toBe(false)
  })

  it('isProxyHealthy C is false when the port is dead', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(isProxyHealthy()).resolves.toBe(false)
  })

  it('isProxyHealthy D is false on a non ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: () => Promise.resolve({}), ok: false } as never)
    await expect(isProxyHealthy()).resolves.toBe(false)
  })

  it('isProxyHealthy E is false when the body is not json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: () => Promise.reject(new Error('nope')), ok: true } as never)
    await expect(isProxyHealthy()).resolves.toBe(false)
  })
})

describe('missingRow', () => {
  it('missingRow A has one cell per header', () => {
    expect(missingRow('rtk')).toHaveLength(headers.length)
  })

  it('missingRow B reports the tool as missing', () => {
    expect(missingRow('rtk')).toMatchInlineSnapshot(`
      [
        "rtk",
        "missing",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "not installed",
      ]
    `)
  })
})

describe('buildRtkRow', () => {
  it('buildRtkRow A reports an active tool', () => {
    mockReadFileSync.mockReturnValue('rtk hook claude')
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'rtk 0.48.0' }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    const { month, row } = buildRtkRow(rtkReport)
    expect(month).toBe(7000)
    expect(row).toStrictEqual(['rtk', 'active', '0.48.0', '42 commands', '1k', '3k', '7k', '30%', '2026-09-10', ''])
  })

  it('buildRtkRow B reports an idle tool when the hook is not wired', () => {
    mockReadFileSync.mockReturnValue('{}')
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'rtk 0.48.0' }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    const { row } = buildRtkRow(rtkReport)
    expect(row[1]).toBe('idle')
    expect(row.at(-1)).toBe('hook not wired')
  })

  it('buildRtkRow C has one cell per header', () => {
    mockReadFileSync.mockReturnValue('{}')
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'rtk 0.48.0' }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    expect(buildRtkRow(rtkReport).row).toHaveLength(headers.length)
  })
})

describe('buildHeadroomRow', () => {
  it('buildHeadroomRow A reports a live proxy', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'headroom, version 0.37.0' }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    const { month, row } = buildHeadroomRow(headroomReport, true)
    expect(month).toBe(3_139_318)
    expect(row).toStrictEqual(['headroom', 'active', '0.37.0', '12 requests', '94,1k', '2M', '3,1M', '16%', '2026-09-10', 'live on :8787'])
  })

  it('buildHeadroomRow B reports a dead proxy', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'headroom, version 0.37.0' }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    const { row } = buildHeadroomRow(headroomReport, false)
    expect(row[1]).toBe('inactive')
    expect(row.at(-1)).toBe('proxy down')
  })
})

describe('pad', () => {
  it('pad A left aligns a regular column', () => {
    expect(pad('notes', 8, 'ok')).toBe('ok      ')
  })

  it('pad B centers a centered column, extra space on the right', () => {
    expect(pad('status', 8, 'idle')).toBe('  idle  ')
  })

  it('pad C centers with an odd remainder', () => {
    expect(pad('status', 7, 'idle')).toBe(' idle  ')
  })

  it('pad D leaves an exact fit untouched', () => {
    expect(pad('status', 4, 'idle')).toBe('idle')
  })
})

describe('renderTable', () => {
  it('renderTable A sizes every column to its widest cell', () => {
    const rows = [missingRow('rtk'), missingRow('headroom')]
    const [header, separator] = renderTable(rows)
    invariant(header !== undefined && separator !== undefined, 'table should have a header and a separator')
    expect(header).toHaveLength(separator.length)
  })

  it('renderTable B has one line per row plus header and separator', () => {
    expect(renderTable([missingRow('rtk')])).toHaveLength(3)
  })

  it('renderTable C colors the status cell only', () => {
    const line = renderTable([missingRow('rtk')]).at(-1)
    invariant(line !== undefined, 'table should have a row')
    expect(line).toContain('\u001B[31m')
  })

  it('renderTable D renders the expected layout', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: 'rtk 0.48.0' }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    mockReadFileSync.mockReturnValue('rtk hook claude')
    const lines = renderTable([buildRtkRow(rtkReport).row, buildHeadroomRow(headroomReport, true).row])
    // the indent is trimmed here to keep the snapshot readable, it gets its own assertion below
    expect(lines.map(line => logger.clean(line.trimStart())).join('\n')).toMatchInlineSnapshot(`
      "| tool     | status | version | usage       | today | 7 days | 30 days | % saved | updated on | notes         |
      |----------|--------|---------|-------------|-------|--------|---------|---------|------------|---------------|
      | rtk      | active | 0.48.0  | 42 commands |  1k   |   3k   |   7k    |   30%   | 2026-09-10 |               |
      | headroom | active | 0.48.0  | 12 requests | 94,1k |   2M   |  3,1M   |   16%   | 2026-09-10 | live on :8787 |"
    `)
  })

  it('renderTable E indents every line so the table breathes in the terminal', () => {
    expect(renderTable([missingRow('rtk')]).every(line => line.startsWith(' |'))).toBe(true)
  })

  it('renderTable F sizes columns on the headers when a row is shorter than them', () => {
    const [header, separator, row] = renderTable([['rtk', 'active']])
    invariant(header !== undefined && separator !== undefined && row !== undefined, 'table should have a header, a separator and a row')
    expect(header).toHaveLength(separator.length)
    expect(logger.clean(row)).toBe(' | rtk  | active |')
  })

  it('renderTable G renders a cell that has no header left', () => {
    const row = renderTable([[...missingRow('rtk'), 'extra']]).at(-1)
    invariant(row !== undefined, 'table should have a row')
    expect(logger.clean(row)).toContain('| extra |')
  })
})

describe('isPonytailEnabled', () => {
  it('isPonytailEnabled A detects the enabled plugin', () => {
    mockReadFileSync.mockReturnValue(enabledSettings)
    expect(isPonytailEnabled()).toBe(true)
  })

  it('isPonytailEnabled B returns false when the plugin is disabled', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ enabledPlugins: { 'ponytail@ponytail': false } }))
    expect(isPonytailEnabled()).toBe(false)
  })

  it('isPonytailEnabled C returns false when no plugin is enabled at all', () => {
    mockReadFileSync.mockReturnValue('{}')
    expect(isPonytailEnabled()).toBe(false)
  })

  it('isPonytailEnabled D returns false when the settings cannot be read', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    expect(isPonytailEnabled()).toBe(false)
  })
})

describe('updatedOnFile', () => {
  it('updatedOnFile A reads the write date', () => {
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    expect(updatedOnFile('/some/file.json')).toBe('2026-09-10')
  })

  it('updatedOnFile B returns a dash when the file cannot be read', () => {
    mockStatSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    expect(updatedOnFile('/some/file.json')).toBe('-')
  })
})

describe('collectPonytail', () => {
  it('collectPonytail A falls back to a missing row when the plugin is not installed', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    const { month, row } = collectPonytail()
    expect(month).toBe(0)
    expect(row[1]).toBe('missing')
  })

  it('collectPonytail B builds a row from the plugin manifest', () => {
    mockPonytailReads()
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-11T12:00:00Z') })
    const { row } = collectPonytail()
    expect(row[0]).toBe('ponytail')
    expect(row[2]).toBe('4.9.0')
    expect(row[8]).toBe('2026-09-11')
  })

  it('collectPonytail C never reports a savings figure it cannot measure', () => {
    mockPonytailReads()
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-11T12:00:00Z') })
    const { month, row } = collectPonytail()
    expect(month).toBe(0)
    expect(row.slice(3, 8)).toStrictEqual(['-', '-', '-', '-', '-'])
    expect(row.at(-1)).toBe('no ledger, not counted here')
  })

  it('collectPonytail D reads idle when the plugin is installed but disabled', () => {
    mockPonytailReads('{}')
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-11T12:00:00Z') })
    const { row } = collectPonytail()
    expect(row[1]).toBe('idle')
    expect(row.at(-1)).toBe('plugin disabled')
  })

  it('collectPonytail E has one cell per header', () => {
    mockPonytailReads()
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-11T12:00:00Z') })
    expect(collectPonytail().row).toHaveLength(headers.length)
  })

  it('collectPonytail F falls back to a dash when the manifest has no version', () => {
    mockReadFileSync.mockReturnValueOnce('{}').mockReturnValueOnce(enabledSettings)
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-11T12:00:00Z') })
    expect(collectPonytail().row[2]).toBe('-')
  })
})

describe('collectRtk', () => {
  it('collectRtk A falls back to a missing row when rtk is not installed', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ error: new Error('ENOENT') }))
    const { month, row } = collectRtk()
    expect(month).toBe(0)
    expect(row[1]).toBe('missing')
  })

  it('collectRtk B builds a row from the json report', () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: JSON.stringify(rtkReport) }))
    mockReadFileSync.mockReturnValue('rtk hook claude')
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    const { month, row } = collectRtk()
    expect(month).toBe(7000)
    expect(row[0]).toBe('rtk')
  })
})

describe('collectHeadroom', () => {
  it('collectHeadroom A falls back to a missing row when headroom is not installed', async () => {
    mockSpawnSync.mockReturnValue(spawnResult({ error: new Error('ENOENT') }))
    const { month, row } = await collectHeadroom()
    expect(month).toBe(0)
    expect(row[1]).toBe('missing')
  })

  it('collectHeadroom B builds a row from the durable ledger', async () => {
    mockSpawnSync.mockReturnValue(spawnResult({ stdout: JSON.stringify(headroomReport) }))
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: () => Promise.resolve({ status: 'healthy' }), ok: true } as never)
    const { month, row } = await collectHeadroom()
    expect(month).toBe(3_139_318)
    expect(row.at(-1)).toBe('live on :8787')
  })
})

describe('start', () => {
  it('start A logs the table and the rolling month total', async () => {
    mockSpawnSync.mockReturnValue(spawnResult({ error: new Error('ENOENT') }))
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    const log = vi.spyOn(console, 'log').mockImplementation(noop)
    await start()
    const logs = log.mock.calls.map(([line]) => logger.clean(String(line)))
    const table = logs.find(line => line.includes('|'))
    invariant(table !== undefined, 'the table should be logged')
    expect(table.split('\n').filter(line => line.includes('|'))).toHaveLength(5)
    expect(logs.at(-1)).toContain('Saved 0 millions tokens over the last 30 days')
  })

  it('start B sums rtk and headroom, never ponytail', async () => {
    // rtk saves a whole million here so that dropping either addend moves the rounded total
    const fatRtkReport = { daily: [{ date: daysAgoIso10(0), input_tokens: 5_000_000, saved_tokens: 1_000_000 }], summary: { total_commands: 42 } }
    mockSpawnSync.mockImplementation(((tool: string) => spawnResult({ stdout: tool === 'headroom' ? JSON.stringify(headroomReport) : JSON.stringify(fatRtkReport) })) as never)
    mockReadFileSync.mockImplementation(((target: string) => (target.includes('plugin.json') ? ponytailManifest : activeSettings)) as never)
    mockStatSync.mockReturnValue({ mtime: new Date('2026-09-10T12:00:00Z') })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: () => Promise.resolve({ status: 'healthy' }), ok: true } as never)
    const log = vi.spyOn(console, 'log').mockImplementation(noop)
    await start()
    const logs = log.mock.calls.map(([line]) => logger.clean(String(line)))
    // 1 000 000 saved by rtk + 3 139 318 by headroom, ponytail contributes nothing by design
    expect(logs.at(-1)).toContain('Saved 4,1 millions tokens over the last 30 days')
  })
})
