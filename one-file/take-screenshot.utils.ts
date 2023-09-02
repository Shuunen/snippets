import { nbMsInSecond, nbSecondsInMinute } from 'shuutils'

export interface FfProbeOutput {
  format: { duration: number; filename: string; size: number; tags: { title: string } }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  streams: { codec_type: string; duration: string; height: number; width: number }[]
}

export interface Task { screenPath: string; totalSeconds: number; videoPath: string }

export interface Metadata { duration: number; filepath?: string; height: number; size: number; title: string }

export const emptyMetadata: Metadata = { duration: 0, height: 0, size: 0, title: '' }

export function parseVideoMetadata (ffProbeOutput?: Partial<FfProbeOutput>): Metadata {
  if (ffProbeOutput?.streams === undefined || ffProbeOutput.streams.length === 0) return emptyMetadata
  const video = ffProbeOutput.streams.find((stream) => stream.codec_type === 'video')
  if (!video) return emptyMetadata
  const { height } = video
  const media = ffProbeOutput.format
  const duration = media?.duration ?? 0
  const title = media?.tags.title ?? ''
  const size = media?.size ?? 0
  return { duration, height, size, title }
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
      seconds += nbSecondsInMinute
      // eslint-disable-next-line sonarjs/elseif-without-else
    } else if (seconds > (nbSecondsInMinute - 1)) {
      minutes = minutesBase + 1
      seconds -= nbSecondsInMinute
    }
    targets.push({ minutes, seconds })
    if (seconds === (nbSecondsInMinute - 1)) minutes += 1
  }
  return targets
}

/**
 * Parse user input to extract the targeted time(s)
 * @param userInput string like "12", "12+-1" or "2106+-2"
 * @returns [{ minutes: 0, seconds: 12 }], [{minutes: 0, seconds: 11}, {minutes: 0, seconds: 12}, {minutes: 0, seconds: 13}] or [{minutes: 21, seconds: 4}, {minutes: 21, seconds: 5}, {minutes: 21, seconds: 6},{minutes: 21, seconds: 7}, {minutes: 21, seconds: 8}]
 */
export function parseUserInput (userInput: string): Target[] {
  const { minutesOrSeconds = '', moduloMarker = '', moduloMaybe = '', secondsMaybe = '' } = (/^(?<minutesOrSeconds>\d{1,2})(?<secondsMaybe>\d{0,2})(?<moduloMarker>[+-]*)(?<moduloMaybe>\d{0,2})$/u.exec(userInput))?.groups ?? {}
  if (minutesOrSeconds === '') return []
  const secondsBase = Number.parseInt(secondsMaybe || minutesOrSeconds, 10)
  const minutesBase = secondsMaybe === '' ? 0 : Number.parseInt(minutesOrSeconds, 10)
  // eslint-disable-next-line no-nested-ternary, @typescript-eslint/no-magic-numbers
  const modulo = moduloMaybe === '' ? (moduloMarker === '' ? 0 : 5) : Number.parseInt(moduloMaybe.replace(/\D/gu, ''), 10)
  return getTargets(modulo, minutesBase, secondsBase)
}

export function readableDuration (seconds: number): string {
  return `${new Date(seconds * nbMsInSecond).toISOString().slice(11, 19).replace(':', 'h').replace(':', 'm')}s` // eslint-disable-line @typescript-eslint/no-magic-numbers
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
  const { duration, height, size, title } = metadata
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
  const { screenPath, totalSeconds, videoPath } = task
  return `ffmpeg -ss ${totalSeconds} -i "${videoPath}" -frames:v 1 -q:v 1 "${screenPath}"`
}
