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
 * Find the 0-based line index in content where a removeLinesAfter cutoff regex first matches
 * @param content the content to search
 * @param regex the cutoff regex, if any
 * @returns the matching line's index, or -1 if there's no cutoff or no match
 */
function findCutoffLineIndex(content: string, regex: RegExp | undefined): number {
  if (!regex) return -1
  return content.split('\n').findIndex(line => regex.test(line))
}

export type NoiseCutoffs = { destCutoff: number; sourceCutoff: number }

/**
 * Precompute each side's removeLinesAfter cutoff line index once per file, so per-line noise checks don't recompute it
 * @param destContent the backup (destination) file content
 * @param sourceContent the live (source) file content
 * @param removeLinesAfter a regex marking the point after which lines are ignored
 * @returns each side's cutoff line index
 */
export function computeNoiseCutoffs(destContent: string, sourceContent: string, removeLinesAfter: RegExp | undefined): NoiseCutoffs {
  return { destCutoff: findCutoffLineIndex(destContent, removeLinesAfter), sourceCutoff: findCutoffLineIndex(sourceContent, removeLinesAfter) }
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

export type NoiseLineOptions = { cutoffIndex: number; line: string; lineIndex: number; removeLinesMatching: RegExp[] | undefined }

/**
 * Whether a single line is safe to auto-resolve : blank, past the removeLinesAfter cutoff line, or matching a removeLinesMatching pattern
 * @param options the line and its position/filters
 * @returns true if this line is ignorable
 */
export function isNoiseLine(options: NoiseLineOptions): boolean {
  const { cutoffIndex, line, lineIndex, removeLinesMatching } = options
  if (line.trim() === '') return true
  if (cutoffIndex !== -1 && lineIndex >= cutoffIndex) return true
  if (!removeLinesMatching) return false
  return removeLinesMatching.some(regex => regex.test(line))
}
