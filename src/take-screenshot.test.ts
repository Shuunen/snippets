import type { FfProbeOutput } from './take-screenshot.types'
import { emptyMetadata, getFfmpegCommand, getScreenshotFilename, getTargets, parseUserInput, parseVideoMetadata, readableDuration, readableSize } from './take-screenshot.utils'

const ffProbeOutputA = { streams: [] }

test('parseVideoMetadata A', () => {
  expect(parseVideoMetadata(ffProbeOutputA)).toBe(emptyMetadata)
})

const ffProbeOutputB = {
  format: {
    bit_rate: 123_456,
    duration: 789,
    filename: 'plop.mp4',
    size: 123_456,
    tags: {
      title: 'plop and the doe',
    },
  },
  streams: [
    {
      avg_frame_rate: '25/1',
      codec_name: 'aac',
      codec_type: 'audio',
      color_transfer: '',
      duration: '',
      height: 0,
      width: 0,
    },
    {
      avg_frame_rate: '25/1',
      codec_name: 'h264',
      codec_type: 'video',
      color_transfer: '',
      duration: '00:00:00.000000',
      height: 1080,
      width: 1920,
    },
  ],
} satisfies null | Partial<FfProbeOutput>

const expectedMetadataB = {
  duration: 789,
  height: 1080,
  size: 123_456,
  title: 'plop and the doe',
}

test('parseVideoMetadata B', () => {
  expect(parseVideoMetadata(ffProbeOutputB)).toStrictEqual(expectedMetadataB)
})

const ffProbeOutputCnoVideo = {
  format: {
    bit_rate: 123_456,
    duration: 123,
    filename: 'jazz.mp3',
    size: 698_765,
    tags: {
      title: 'couch jazz',
    },
  },
  streams: [
    {
      avg_frame_rate: '25/1',
      codec_name: 'aac',
      codec_type: 'audio',
      color_transfer: '',
      duration: '',
      height: 0,
      width: 0,
    },
  ],
} satisfies null | Partial<FfProbeOutput>

test('parseVideoMetadata C', () => {
  expect(parseVideoMetadata(ffProbeOutputCnoVideo)).toBe(emptyMetadata)
})

const ffProbeOutputDnoFormat = {
  streams: [
    {
      avg_frame_rate: '25/1',
      codec_name: 'h264',
      codec_type: 'video',
      color_transfer: '',
      duration: '12',
      height: 720,
      width: 1280,
    },
  ],
} satisfies null | Partial<FfProbeOutput>

const expectedMetadataD = {
  duration: 0,
  height: 720,
  size: 0,
  title: '',
}

test('parseVideoMetadata D', () => {
  expect(parseVideoMetadata(ffProbeOutputDnoFormat)).toStrictEqual(expectedMetadataD)
})

test('parseUserInput A specific ss', () => {
  expect(parseUserInput('12')).toStrictEqual([{ minutes: 0, seconds: 12 }])
})
test('parseUserInput B ss+-1', () => {
  expect(parseUserInput('12+-1')).toStrictEqual([
    { minutes: 0, seconds: 11 },
    { minutes: 0, seconds: 12 },
    { minutes: 0, seconds: 13 },
  ])
})
test('parseUserInput C mmss+-2', () => {
  expect(parseUserInput('2106+-2')).toStrictEqual([
    { minutes: 21, seconds: 4 },
    { minutes: 21, seconds: 5 },
    { minutes: 21, seconds: 6 },
    { minutes: 21, seconds: 7 },
    { minutes: 21, seconds: 8 },
  ])
})
test('parseUserInput D mmss around minute gaps', () => {
  expect(parseUserInput('0100-+1')).toStrictEqual([
    { minutes: 0, seconds: 59 },
    { minutes: 1, seconds: 0 },
    { minutes: 1, seconds: 1 },
  ])
})
test('parseUserInput E mmss around minute gaps', () => {
  expect(parseUserInput('0100-+2')).toStrictEqual([
    { minutes: 0, seconds: 58 },
    { minutes: 0, seconds: 59 },
    { minutes: 1, seconds: 0 },
    { minutes: 1, seconds: 1 },
    { minutes: 1, seconds: 2 },
  ])
})
test('parseUserInput F mmss around minute gaps', () => {
  expect(parseUserInput('0100-+3')).toStrictEqual([
    { minutes: 0, seconds: 57 },
    { minutes: 0, seconds: 58 },
    { minutes: 0, seconds: 59 },
    { minutes: 1, seconds: 0 },
    { minutes: 1, seconds: 1 },
    { minutes: 1, seconds: 2 },
    { minutes: 1, seconds: 3 },
  ])
})
test('parseUserInput G mmss around minute gaps', () => {
  expect(parseUserInput('2201-+2')).toStrictEqual([
    { minutes: 21, seconds: 59 },
    { minutes: 22, seconds: 0 },
    { minutes: 22, seconds: 1 },
    { minutes: 22, seconds: 2 },
    { minutes: 22, seconds: 3 },
  ])
})
test('parseUserInput H mmss around minute gaps', () => {
  expect(parseUserInput('2259-+2')).toStrictEqual([
    { minutes: 22, seconds: 57 },
    { minutes: 22, seconds: 58 },
    { minutes: 22, seconds: 59 },
    { minutes: 23, seconds: 0 },
    { minutes: 23, seconds: 1 },
  ])
})
test('parseUserInput I empty input', () => {
  expect(parseUserInput('')).toStrictEqual([])
})
test('parseUserInput J invalid input', () => {
  expect(parseUserInput('plop')).toStrictEqual([])
})
test('parseUserInput K invalid input', () => {
  expect(parseUserInput('12plop')).toStrictEqual([])
})
test('parseUserInput L invalid input', () => {
  expect(parseUserInput('plop12')).toStrictEqual([])
})
test('parseUserInput M specific mmss', () => {
  expect(parseUserInput('1234')).toStrictEqual([{ minutes: 12, seconds: 34 }])
})
test('parseUserInput N default to modulo 5 if marker exists', () => {
  expect(parseUserInput('1234+-')).toMatchSnapshot()
})

test('readableDuration A', () => {
  expect(readableDuration(0)).toBe('00h00m00s')
})
test('readableDuration B', () => {
  expect(readableDuration(28)).toBe('00h00m28s')
})
test('readableDuration C', () => {
  expect(readableDuration(60)).toBe('00h01m00s')
})
test('readableDuration D', () => {
  expect(readableDuration(61)).toBe('00h01m01s')
})
test('readableDuration E', () => {
  expect(readableDuration(3600)).toBe('01h00m00s')
})
test('readableDuration F', () => {
  expect(readableDuration(3612)).toBe('01h00m12s')
})

test('readableSize A', () => {
  expect(readableSize(0)).toBe('0mo')
})
test('readableSize B', () => {
  expect(readableSize(1000)).toBe('0mo')
})
test('readableSize C', () => {
  expect(readableSize(1_000_000)).toBe('1mo')
})
test('readableSize D', () => {
  expect(readableSize(1_000_000_000)).toBe('954mo')
})
test('readableSize E', () => {
  expect(readableSize(1_000_000_000_000)).toBe('931,3go')
})
test('readableSize F', () => {
  expect(readableSize(1_924_654_000)).toBe('1,8go')
})

test('getScreenshotFilename A', () => {
  expect(getScreenshotFilename(3600, { duration: 789, height: 1080, size: 123_456_789, title: 'plop' })).toBe('plop 01h00m00s 118mo 1080p 00h13m09s.jpg')
})
test('getScreenshotFilename B', () => {
  expect(
    getScreenshotFilename(126, {
      duration: 1_000_000,
      height: 720,
      size: 1_000_000_000,
      title: 'The little John and the Doe are awaiting the arrival of the big John (2013) Encoded by HurrayXXX_36 x265 10bit HDR DTS-HD-MA',
    }),
  ).toBe('The little John and the Doe are awaiting the arrival of the big John (2013) Encoded by HurrayXXX_36 x265 10bit HDR DTS-HD-MA 00h02m06s 954mo 720p 13h46m40s.jpg')
})
test('getScreenshotFilename C', () => {
  expect(getScreenshotFilename(0, { duration: 0, height: 0, size: 0, title: '' })).toBe('00h00m00s 0mo 0p 00h00m00s.jpg')
})

test('getFfmpegCommand A', () => {
  expect(getFfmpegCommand({ screenPath: 'plop.jpg', totalSeconds: 120, videoPath: 'plop.mp4' })).toBe('ffmpeg -ss 120 -i "plop.mp4" -frames:v 1 -q:v 1 -update 1 "plop.jpg"')
})

test('getTargets A', () => {
  expect(getTargets(5, 2, 30)).toMatchSnapshot()
})
