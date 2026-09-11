import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { bold, dateIso10, green, Logger, nbDaysInMonth, nbDaysInWeek, nbMsInSecond, nbOneHalf, parseJson, red, Result } from 'shuutils'
import { type HeadroomReport, millions, type Row, type RtkReport, rollingWindow, short, windowSavingsPct } from './token-saved.utils'

// use me like : bun ~/Projects/github/snippets/src/token-saved.cli.ts
// rtk filters bash output before it reaches the model, Headroom compresses the API payload
// itself, both keep their own ledger so this reads each one and prints a single table

// the delay column would prefix every line with 7 gray characters, too noisy for a one-shot report
export const logger = new Logger({ willLogDelay: false, willOutputToMemory: true })

const healthUrl = 'http://127.0.0.1:8787/health'
const settingsPath = path.join(homedir(), '.claude', 'settings.json')
const rtkHookMarker = 'rtk hook claude'
/** Both tools print their version as the last token, like "headroom, version 0.37.0" */
const lastToken = /(?<token>\S+)$/
const nbSecondsBeforeCommandTimeout = 15
const nbSecondsBeforeHealthTimeout = 2
const commandTimeout = nbSecondsBeforeCommandTimeout * nbMsInSecond
const healthTimeout = nbSecondsBeforeHealthTimeout * nbMsInSecond
/** Rolling windows ending today, inclusive : today, last week, last month */
const windowsInDays = [1, nbDaysInWeek, nbDaysInMonth]
/** The "% saved" column is the ratio over the last month, so it reconciles with the window columns before it */
export const headers = ['tool', 'status', 'version', 'usage', 'today', `${nbDaysInWeek} days`, `${nbDaysInMonth} days`, '% saved', 'updated on', 'notes']
/** Columns rendered centered, the rest stay left aligned */
const centered = new Set(['status', 'version', 'today', `${nbDaysInWeek} days`, `${nbDaysInMonth} days`, '% saved', 'updated on'])
const nbFixedCells = 3 // the tool name, the status and the notes
const missingCells = headers.length - nbFixedCells
/** Shown when a value cannot be read */
const unknownValue = '-'

/**
 * Run a command and parse its json output
 * @param command the binary to run
 * @param args the arguments to pass
 * @returns a Result holding the parsed payload
 */
export function runJson<Type>(command: string, args: string[]) {
  const spawn = Result.trySafe(() => spawnSync(command, args, { encoding: 'utf8', timeout: commandTimeout }))
  if (!spawn.ok) return Result.error(`cannot run ${command} : ${String(spawn.error)}`)
  if (spawn.value.error) return Result.error(`${command} is not available`)
  const { error, value } = parseJson<Type>(spawn.value.stdout)
  if (error) return Result.error(`${command} did not return json : ${error}`)
  return Result.ok(value)
}

/**
 * Locate a binary on the system
 * @param tool the binary name
 * @returns a Result holding the absolute path
 */
export function binaryPath(tool: string) {
  const spawn = Result.trySafe(() => spawnSync(process.platform === 'win32' ? 'where' : 'which', [tool], { encoding: 'utf8', timeout: commandTimeout }))
  if (!spawn.ok || spawn.value.error || spawn.value.status !== 0) return Result.error(`${tool} is not installed`)
  const [target] = spawn.value.stdout.trim().split('\n')
  if (!target) return Result.error(`${tool} is not installed`)
  return Result.ok(target)
}

/**
 * Read the version of a tool, both of them print it as the last token, like "headroom, version 0.37.0"
 * @param tool the binary name
 * @returns the version or a dash
 */
export function versionOf(tool: string) {
  const spawn = Result.trySafe(() => spawnSync(tool, ['--version'], { encoding: 'utf8', timeout: commandTimeout }))
  if (!spawn.ok || spawn.value.error) return unknownValue
  return lastToken.exec(spawn.value.stdout.trim())?.groups?.token ?? unknownValue
}

/**
 * Date the installed binary was last written, aka when it was installed or updated
 * @param tool the binary name
 * @returns an iso date or a dash
 */
export function updatedOn(tool: string) {
  const found = binaryPath(tool)
  if (!found.ok) return unknownValue
  const stat = Result.trySafe(() => statSync(found.value))
  if (!stat.ok) return unknownValue
  return dateIso10(stat.value.mtime)
}

/**
 * Headroom only compresses while Claude Code actually routes through the proxy
 * @returns true when the proxy answers healthy
 */
export async function isProxyHealthy() {
  const call = await Result.trySafe(fetch(healthUrl, { signal: AbortSignal.timeout(healthTimeout) }))
  if (!call.ok || !call.value.ok) return false
  const body = await Result.trySafe(call.value.json() as Promise<{ status?: string }>)
  if (!body.ok) return false
  return body.value.status === 'healthy'
}

/**
 * The hook is what makes rtk actually intercept anything, without it the binary just sits there
 * @returns true when the PreToolUse hook is registered
 */
export function isRtkWired() {
  const read = Result.trySafe(() => readFileSync(settingsPath, 'utf8'))
  if (!read.ok) return false
  return read.value.includes(rtkHookMarker)
}

/**
 * Build a row for a tool that is not installed
 * @param tool the tool name
 * @returns the row
 */
export function missingRow(tool: string): Row {
  return [tool, 'missing', ...Array.from<string>({ length: missingCells }).fill(unknownValue), 'not installed']
}

/**
 * Build the rtk row and what it saved over the last month
 * @param report the parsed `rtk gain --daily --format json` payload
 * @returns the row and the rolling month total
 */
export function buildRtkRow(report: RtkReport) {
  const { daily, summary } = report
  const isWired = isRtkWired()
  const row: Row = [
    'rtk',
    isWired ? 'active' : 'idle',
    versionOf('rtk'),
    `${summary.total_commands} commands`,
    ...windowsInDays.map(days => short(rollingWindow(daily, days))),
    `${Math.round(windowSavingsPct(daily, nbDaysInMonth))}%`,
    updatedOn('rtk'),
    isWired ? '' : 'hook not wired',
  ]
  return { month: rollingWindow(daily, nbDaysInMonth), row }
}

/**
 * Build the Headroom row and what it saved over the last month
 * @param report the parsed `headroom savings --json` payload
 * @param isHealthy true when the proxy answers
 * @returns the row and the rolling month total
 */
export function buildHeadroomRow(report: HeadroomReport, isHealthy: boolean) {
  const { lifetime, windows } = report
  const row: Row = [
    'headroom',
    isHealthy ? 'active' : 'inactive',
    versionOf('headroom'),
    `${lifetime.calls} requests`,
    ...[windows.today, windows.last_7_days, windows.last_30_days].map(window => short(window.tokens_saved)),
    `${Math.round(windows.last_30_days.savings_percent)}%`,
    updatedOn('headroom'),
    isHealthy ? 'live on :8787' : 'proxy down',
  ]
  return { month: windows.last_30_days.tokens_saved, row }
}

/**
 * Read rtk savings, the totals come from the json report and never from the rendered
 * `rtk gain` table, that one is rounded to "32.0M" and cannot be reconciled with anything
 * @returns the row and the rolling month total
 */
export function collectRtk() {
  const report = runJson<RtkReport>('rtk', ['gain', '--daily', '--format', 'json'])
  if (!report.ok) {
    logger.debug(report.error)
    return { month: 0, row: missingRow('rtk') }
  }
  return buildRtkRow(report.value)
}

/**
 * Read Headroom savings from its durable ledger, the /stats endpoint of the proxy would
 * only know what the current process has seen and resets on every restart
 * @returns the row and the rolling month total
 */
export async function collectHeadroom() {
  const report = runJson<HeadroomReport>('headroom', ['savings', '--json'])
  if (!report.ok) {
    logger.debug(report.error)
    return { month: 0, row: missingRow('headroom') }
  }
  return buildHeadroomRow(report.value, await isProxyHealthy())
}

/**
 * Pad a cell to the width of its column
 * @param header the column header
 * @param width the column width
 * @param cell the cell content
 * @returns the padded cell
 */
export function pad(header: string, width: number, cell: string) {
  if (!centered.has(header)) return cell.padEnd(width)
  const left = Math.floor((width - cell.length) * nbOneHalf)
  return `${' '.repeat(left)}${cell}`.padEnd(width)
}

/**
 * Render a pipe table sized to its widest cell
 * @param rows the rows to render
 * @returns the table lines
 */
export function renderTable(rows: Row[]) {
  const indent = ' '
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map(row => (row[index] ?? '').length)))
  const lines = [`${indent}| ${headers.map((header, index) => pad(header, widths[index] ?? 0, header)).join(' | ')} |`, `${indent}|-${widths.map(width => '-'.repeat(width)).join('-|-')}-|`]
  // color is applied after padding, never before : escape codes have no display width so measuring them would throw every column off
  for (const row of rows) {
    const color = row[1] === 'active' ? green : red
    const cells = row.map((cell, index) => {
      const padded = pad(headers[index] ?? '', widths[index] ?? 0, cell)
      return headers[index] === 'status' ? color(padded) : padded
    })
    lines.push(`${indent}| ${cells.join(' | ')} |`)
  }
  return lines
}

/**
 * Show the combined savings of both tools
 */
export async function start() {
  const rtk = collectRtk()
  const headroom = await collectHeadroom()
  // a single log call keeps the table as one block, the logger prefixes would break the alignment line by line
  console.log(`\n${renderTable([rtk.row, headroom.row]).join('\n')}\n`)
  console.log(` Saved ${bold(millions(rtk.month + headroom.month))} tokens over the last ${nbDaysInMonth} days\n`)
}

// avoid running this script if it's imported for testing
/* v8 ignore if */
if (process.argv[1]?.includes('token-saved.cli.ts')) await start()
