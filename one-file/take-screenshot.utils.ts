interface FfProbeOutput {
  format: { filename: string; tags: { title: string }; size: number; duration: number }
  streams: { codec_type: string; width: number; height: number; duration: string }[]
}

export interface Task { totalSeconds: number; videoPath: string; screenPath: string }

export interface Metadata { title: string; size: number; height: number; duration: number; filepath?: string }

export const emptyMetadata: Metadata = { title: '', duration: 0, size: 0, height: 0 }

export const parseVideoMetadata = (ffProbeOutput: Partial<FfProbeOutput>): Metadata => {
  if (ffProbeOutput === undefined || ffProbeOutput.streams === undefined || ffProbeOutput.streams.length === 0) return emptyMetadata
  const video = ffProbeOutput.streams.find((stream) => stream.codec_type === 'video')
  if (!video) return emptyMetadata
  const height = video.height
  const media = ffProbeOutput.format
  const duration = media?.duration ?? 0
  const title = media?.tags.title ?? ''
  const size = media?.size ?? 0
  return { title, size, height, duration }
}

export interface Target { minutes: number; seconds: number }

/**
 * Parse user input to extract the targeted time(s)
 * @param userInput string like "12", "12+-1" or "2106+-2"
 * @returns [{ minutes: 0, seconds: 12 }], [{minutes: 0, seconds: 11}, {minutes: 0, seconds: 12}, {minutes: 0, seconds: 13}] or [{minutes: 21, seconds: 4}, {minutes: 21, seconds: 5}, {minutes: 21, seconds: 6},{minutes: 21, seconds: 7}, {minutes: 21, seconds: 8}]
 */
export const parseUserInput = (userInput: string): Target[] => {
  const { minutesOrSeconds, secondsMaybe, moduloMarker, moduloMaybe } = userInput.match(/^(?<minutesOrSeconds>\d{1,2})(?<secondsMaybe>\d{1,2})?(?<moduloMarker>[+-]{1,2})?(?<moduloMaybe>\d{1,2})?$/)?.groups || {}
  if (minutesOrSeconds === undefined) return []
  const secondsBase = Number.parseInt(secondsMaybe || minutesOrSeconds, 10)
  const minutesBase = secondsMaybe === undefined ? 0 : Number.parseInt(minutesOrSeconds, 10)
  const modulo = moduloMaybe === undefined ? (moduloMarker === undefined ? 0 : 5) : Number.parseInt(moduloMaybe.replace(/\D/g, ''), 10)
  const targets = []
  let seconds = 0
  let minutes = minutesBase
  for (let step = -modulo; step <= modulo; step++) {
    seconds = secondsBase + step
    if (seconds < 0) {
      minutes = minutesBase - 1
      seconds = 60 + seconds
    } else if (seconds > 59) {
      minutes = minutesBase + 1
      seconds = seconds - 60
    }
    targets.push({ minutes, seconds })
    if (seconds === 59) minutes++
  }
  return targets
}

export const readableDuration = (seconds: number): string => new Date(seconds * 1000).toISOString().slice(11, 19).replace(':', 'h').replace(':', 'm') + 's'

export const readableSize = (size: number): string => {
  let unit = 'go'
  let nb = (size / 1024 / 1024 / 1024).toFixed(1)
  if (nb[0] === '0') {
    unit = 'mo'
    nb = String(Math.round(size / 1024 / 1024))
  }
  return nb.replace('.', ',') + unit
}

export const getScreenshotFilename = (totalSeconds: number, metadata: Metadata): string => {
  const { size, height, duration, title } = metadata
  const screenName = [
    title.replace(/\./g, ' '),
    readableDuration(totalSeconds),
    readableSize(size),
    height + 'p',
    readableDuration(duration),
  ].join(' ').trim() + '.jpg'
  // replace un-authorized characters in filename
  return screenName.replace(/\s?["*/:<>?\\|]+\s?/g, ' ').replace(/\s+/g, ' ')
}

export const getFfmpegCommand = (task: Task): string => {
  const { totalSeconds, videoPath, screenPath } = task
  return `ffmpeg -ss ${totalSeconds} -i "${videoPath}" -frames:v 1 -q:v 1 "${screenPath}"`
}
