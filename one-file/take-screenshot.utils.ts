/* c8 ignore next */
import { Nb } from 'shuutils'

export interface FfProbeOutput {
  format: { filename: string; tags: { title: string }; size: number; duration: number }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  streams: { codec_type: string; width: number; height: number; duration: string }[]
}

export interface Task { totalSeconds: number; videoPath: string; screenPath: string }

export interface Metadata { title: string; size: number; height: number; duration: number; filepath?: string }

export const emptyMetadata: Metadata = { title: '', duration: 0, size: 0, height: 0 }

export function parseVideoMetadata (ffProbeOutput?: Partial<FfProbeOutput>): Metadata {
  if (ffProbeOutput === undefined || ffProbeOutput.streams === undefined || ffProbeOutput.streams.length === 0) return emptyMetadata
  const video = ffProbeOutput.streams.find((stream) => stream.codec_type === 'video')
  if (!video) return emptyMetadata
  const { height } = video
  const media = ffProbeOutput.format
  const duration = media?.duration ?? 0
  const title = media?.tags.title ?? ''
  const size = media?.size ?? 0
  return { title, size, height, duration }
}

export interface Target { minutes: number; seconds: number }

// eslint-disable-next-line max-statements
export function getTargets (modulo: number, minutesBase: number, secondsBase: number): Target[] {
  const targets = []
  let seconds = 0
  let minutes = minutesBase
  for (let step = -modulo; step <= modulo; step += 1) {
    seconds = secondsBase + step
    if (seconds < 0) {
      minutes = minutesBase - 1
      seconds += Nb.SecondsInMinute
      // eslint-disable-next-line sonarjs/elseif-without-else
    } else if (seconds > (Nb.SecondsInMinute - Nb.One)) {
      minutes = minutesBase + 1
      seconds -= Nb.SecondsInMinute
    }
    targets.push({ minutes, seconds })
    if (seconds === (Nb.SecondsInMinute - Nb.One)) minutes += 1
  }
  return targets
}

/**
 * Parse user input to extract the targeted time(s)
 * @param userInput string like "12", "12+-1" or "2106+-2"
 * @returns [{ minutes: 0, seconds: 12 }], [{minutes: 0, seconds: 11}, {minutes: 0, seconds: 12}, {minutes: 0, seconds: 13}] or [{minutes: 21, seconds: 4}, {minutes: 21, seconds: 5}, {minutes: 21, seconds: 6},{minutes: 21, seconds: 7}, {minutes: 21, seconds: 8}]
 */
export function parseUserInput (userInput: string): Target[] {
  const { minutesOrSeconds = '', secondsMaybe = '', moduloMarker = '', moduloMaybe = '' } = (/^(?<minutesOrSeconds>\d{1,2})(?<secondsMaybe>\d{0,2})(?<moduloMarker>[+-]*)(?<moduloMaybe>\d{0,2})$/u.exec(userInput))?.groups ?? {}
  if (minutesOrSeconds === '') return []
  const secondsBase = Number.parseInt(secondsMaybe || minutesOrSeconds, 10)
  const minutesBase = secondsMaybe === '' ? 0 : Number.parseInt(minutesOrSeconds, 10)
  // eslint-disable-next-line no-nested-ternary
  const modulo = moduloMaybe === '' ? (moduloMarker === '' ? Nb.None : Nb.Five) : Number.parseInt(moduloMaybe.replace(/\D/gu, ''), 10)
  return getTargets(modulo, minutesBase, secondsBase)
}

export function readableDuration (seconds: number): string {
  return `${new Date(seconds * Nb.Thousand).toISOString().slice(11, 19).replace(':', 'h').replace(':', 'm')}s` // eslint-disable-line @typescript-eslint/no-magic-numbers
}

export function readableSize (size: number): string {
  let unit = 'go'
  let nb = (size / 1024 / 1024 / 1024).toFixed(1) // eslint-disable-line @typescript-eslint/no-magic-numbers
  if (nb.startsWith('0')) {
    unit = 'mo'
    nb = String(Math.round(size / 1024 / 1024)) // eslint-disable-line @typescript-eslint/no-magic-numbers
  }
  return nb.replace('.', ',') + unit
}

export function getScreenshotFilename (totalSeconds: number, metadata: Metadata): string {
  const { size, height, duration, title } = metadata
  const screenName = `${[
    title.replace(/\./gu, ' '),
    readableDuration(totalSeconds),
    readableSize(size),
    `${height}p`,
    readableDuration(duration),
  ].join(' ').trim()}.jpg`
  // replace un-authorized characters in filename
  return screenName.replace(/\s?["*/:<>?\\|]+\s?/gu, ' ').replace(/\s+/gu, ' ')
}

export function getFfmpegCommand (task: Task): string {
  const { totalSeconds, videoPath, screenPath } = task
  return `ffmpeg -ss ${totalSeconds} -i "${videoPath}" -frames:v 1 -q:v 1 "${screenPath}"`
}

