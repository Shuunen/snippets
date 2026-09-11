import { daysAgoIso10, round } from 'shuutils'

const nbDecimals = 1
const nbPercent = 100
const oneMillion = 1e6
/** Compact units for the window columns, biggest first */
const units = [
  { size: 1e9, suffix: 'G' },
  { size: 1e6, suffix: 'M' },
  { size: 1e3, suffix: 'k' },
]

export type Row = string[]

type RtkDay = { date: string; input_tokens: number; saved_tokens: number }

export type RtkReport = {
  daily: RtkDay[]
  summary: { total_commands: number }
}

type HeadroomWindow = { savings_percent: number; tokens_saved: number }

export type HeadroomReport = {
  lifetime: { calls: number }
  windows: { last_7_days: HeadroomWindow; last_30_days: HeadroomWindow; today: HeadroomWindow }
}

/**
 * Format a token count the french way, like "32 millions" or "0,6 millions"
 * @param count the number of tokens
 * @returns the humanized count
 */
export function millions(count: number) {
  return `${round(count / oneMillion, nbDecimals)
    .toString()
    .replace('.', ',')} millions`
}

/**
 * Compact form for the window columns, where a daily figure can be a few thousand only
 * @param count the number of tokens
 * @returns the humanized count, like "72k" or "1,1M"
 * @example short(72034) // "72k"
 */
export function short(count: number) {
  for (const { size, suffix } of units)
    if (Math.abs(count) >= size)
      return `${round(count / size, nbDecimals)
        .toString()
        .replace('.', ',')}${suffix}`
  return Math.round(count).toString()
}

/**
 * Keep the entries of a per-day ledger falling into a window ending today, inclusive
 * @param daily the per-day entries
 * @param days the window length, 1 meaning today only
 * @returns the entries inside the window
 */
function withinWindow(daily: RtkDay[], days: number) {
  const oldest = daysAgoIso10(days - 1)
  return daily.filter(day => day.date >= oldest)
}

/**
 * Sum a per-day ledger over a window ending today, inclusive
 * @param daily the per-day entries
 * @param days the window length, 1 meaning today only
 * @returns the number of tokens saved
 * @example rollingWindow([{ date: '2026-09-11', input_tokens: 100, saved_tokens: 42 }], 1) // 42
 */
export function rollingWindow(daily: RtkDay[], days: number) {
  return withinWindow(daily, days).reduce((total, day) => total + day.saved_tokens, 0)
}

/**
 * Share of the raw payload rtk filtered out over a window, the lifetime average would not match
 * the window columns sitting next to it in the table
 * @param daily the per-day entries
 * @param days the window length, 1 meaning today only
 * @returns the percentage, zero when nothing went through rtk during the window
 */
export function windowSavingsPct(daily: RtkDay[], days: number) {
  const window = withinWindow(daily, days)
  const input = window.reduce((total, day) => total + day.input_tokens, 0)
  if (input === 0) return 0
  return (window.reduce((total, day) => total + day.saved_tokens, 0) / input) * nbPercent
}
