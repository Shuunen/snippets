import type { BySide, NoiseFilters } from '../core/types'

/**
 * Split text into its lines, each keeping its own trailing newline (except possibly the very
 * last one), so joining the pieces back together with `''` always reconstructs the exact
 * original text — unlike a plain `split('\n')`, which drops that information
 * @param text the text to split
 * @returns the line segments, each still ending with `\n` unless it's the file's last line
 */
export function splitKeepingNewlines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+/gu) ?? []
}

export type Run = { isNoise: boolean; length: number; start: number }

/**
 * Group a range of indices into maximal runs of consecutive indices sharing the same noise status
 * @param length the number of indices to group, from 0 to length - 1
 * @param isNoiseAt tells whether a given index is noise
 * @returns the ordered list of runs
 */
export function computeRuns(length: number, isNoiseAt: (index: number) => boolean): Run[] {
  const runs: Run[] = []
  for (let index = 0; index < length; index += 1) {
    const isNoise = isNoiseAt(index)
    const last = runs.at(-1)
    if (last?.isNoise === isNoise) last.length += 1
    else runs.push({ isNoise, length: 1, start: index })
  }
  return runs
}

/**
 * Join back the slice of lines a run covers
 * @param lines the lines the run indexes into
 * @param run the run to extract
 * @returns the run's raw text
 */
export function joinRun(lines: string[], run: Run): string {
  return lines.slice(run.start, run.start + run.length).join('')
}

/**
 * Find the 0-based line index in content where a removeLinesAfter cutoff regex first matches
 * @param content the content to search
 * @param regex the cutoff regex, if any
 * @returns the matching line's index, or -1 if there's no cutoff or no match
 */
function findCutoffLineIndex(content: string, regex: RegExp | undefined): number {
  if (!regex) return -1
  return content.split('\n').findIndex(line => regex.test(line))
}

/** each side's removeLinesAfter cutoff line index, or -1 when that side has none */
export type NoiseCutoffs = BySide<number>

/**
 * Precompute each side's removeLinesAfter cutoff line index once per file, so per-line noise checks don't recompute it
 * @param contents each side's file content
 * @param removeLinesAfter a regex marking the point after which lines are ignored
 * @returns each side's cutoff line index
 */
export function computeNoiseCutoffs(contents: BySide<string>, removeLinesAfter: RegExp | undefined): NoiseCutoffs {
  return { local: findCutoffLineIndex(contents.local, removeLinesAfter), repo: findCutoffLineIndex(contents.repo, removeLinesAfter) }
}

/**
 * Build a per-line lookup of the INI-style section (`[Header]`) each line falls under, so a
 * change inside an existing, unchanged section can still be matched against removeBlocksMatching
 * even when the header line itself isn't part of what changed
 * @param content the file content to scan
 * @returns each line's enclosing section header (its own raw line if it is one), or '' before any header
 */
export function buildSectionLookup(content: string): string[] {
  const lines = content.split('\n')
  const lookup: string[] = []
  let current = ''
  for (const line of lines) {
    if (/^\[.*\]/u.test(line)) current = line
    lookup.push(current)
  }
  return lookup
}

export type NoiseLineOptions = { cutoffIndex: number; filters: NoiseFilters; line: string; lineIndex: number }

/**
 * Whether a single line is safe to auto-resolve : blank, past the removeLinesAfter cutoff line, or matching a removeLinesMatching pattern
 * @param options the line and its position/filters
 * @returns true if this line is ignorable
 */
export function isNoiseLine(options: NoiseLineOptions): boolean {
  const { cutoffIndex, filters, line, lineIndex } = options
  if (line.trim() === '') return true
  if (cutoffIndex !== -1 && lineIndex >= cutoffIndex) return true
  return filters.removeLinesMatching?.some(regex => regex.test(line)) ?? false
}

export type NoiseWholeSideOptions = { cutoffIndex: number; filters: NoiseFilters; lines: string[]; startLine: number }

/**
 * Whether every line of a side's text is noise, given where it starts
 * @param options the side's lines and their position/filters
 * @returns true if every line is noise (vacuously true when there are no lines)
 */
export function isNoiseWholeSide(options: NoiseWholeSideOptions): boolean {
  const { cutoffIndex, filters, lines, startLine } = options
  return lines.every((line, index) => isNoiseLine({ cutoffIndex, filters, line, lineIndex: startLine + index }))
}
