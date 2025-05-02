import { expect, it } from 'vitest'
import { emptyMetadata, getFfmpegCommand, getScreenshotFilename, getTargets, parseUserInput, parseVideoMetadata, readableDuration, readableSize } from './take-screenshot.utils'
import type { FfProbeOutput } from './take-screenshot.types'

const ffProbeOutputA = { streams: [] }

it('parseVideoMetadata A', () => { expect(parseVideoMetadata(ffProbeOutputA)).toBe(emptyMetadata) })

const ffProbeOutputB = {
  format: {
    bit_rate: 123_456, // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: 789,
    filename: 'plop.mp4',
    size: 123_456,
    tags: {
      title: 'plop and the doe',
    },
  },
  streams: [{
    avg_frame_rate: '25/1', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_name: 'aac', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_type: 'audio', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    color_transfer: '', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: '',
    height: 0,
    width: 0,
  }, {
    avg_frame_rate: '25/1', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_name: 'h264', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_type: 'video', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    color_transfer: '', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: '00:00:00.000000',
    height: 1080,
    width: 1920,
  }],
} satisfies null | Partial<FfProbeOutput>

const expectedMetadataB = {
  duration: 789,
  height: 1080,
  size: 123_456,
  title: 'plop and the doe',
}

it('parseVideoMetadata B', () => { expect(parseVideoMetadata(ffProbeOutputB)).toStrictEqual(expectedMetadataB) })

const ffProbeOutputCnoVideo = {
  format: {
    bit_rate: 123_456, // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: 123,
    filename: 'jazz.mp3',
    size: 698_765,
    tags: {
      title: 'couch jazz',
    },
  },
  streams: [{
    avg_frame_rate: '25/1', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_name: 'aac', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_type: 'audio', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    color_transfer: '', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: '',
    height: 0,
    width: 0,
  }],
} satisfies null | Partial<FfProbeOutput>

it('parseVideoMetadata C', () => { expect(parseVideoMetadata(ffProbeOutputCnoVideo)).toBe(emptyMetadata) })

const ffProbeOutputDnoFormat = {
  streams: [{
    avg_frame_rate: '25/1', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_name: 'h264', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_type: 'video', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    color_transfer: '', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: '12',
    height: 720,
    width: 1280,
  }],
} satisfies null | Partial<FfProbeOutput>

const expectedMetadataD = {
  duration: 0,
  height: 720,
  size: 0,
  title: '',
}

it('parseVideoMetadata D', () => { expect(parseVideoMetadata(ffProbeOutputDnoFormat)).toStrictEqual(expectedMetadataD) })

it('parseUserInput A specific ss', () => { expect(parseUserInput('12')).toStrictEqual([{ minutes: 0, seconds: 12 }]) })
it('parseUserInput B ss+-1', () => { expect(parseUserInput('12+-1')).toStrictEqual([{ minutes: 0, seconds: 11 }, { minutes: 0, seconds: 12 }, { minutes: 0, seconds: 13 }]) })
it('parseUserInput C mmss+-2', () => { expect(parseUserInput('2106+-2')).toStrictEqual([{ minutes: 21, seconds: 4 }, { minutes: 21, seconds: 5 }, { minutes: 21, seconds: 6 }, { minutes: 21, seconds: 7 }, { minutes: 21, seconds: 8 }]) })
it('parseUserInput D mmss around minute gaps', () => { expect(parseUserInput('0100-+1')).toStrictEqual([{ minutes: 0, seconds: 59 }, { minutes: 1, seconds: 0 }, { minutes: 1, seconds: 1 }]) })
it('parseUserInput E mmss around minute gaps', () => { expect(parseUserInput('0100-+2')).toStrictEqual([{ minutes: 0, seconds: 58 }, { minutes: 0, seconds: 59 }, { minutes: 1, seconds: 0 }, { minutes: 1, seconds: 1 }, { minutes: 1, seconds: 2 }]) })
it('parseUserInput F mmss around minute gaps', () => { expect(parseUserInput('0100-+3')).toStrictEqual([{ minutes: 0, seconds: 57 }, { minutes: 0, seconds: 58 }, { minutes: 0, seconds: 59 }, { minutes: 1, seconds: 0 }, { minutes: 1, seconds: 1 }, { minutes: 1, seconds: 2 }, { minutes: 1, seconds: 3 }]) })
it('parseUserInput G mmss around minute gaps', () => { expect(parseUserInput('2201-+2')).toStrictEqual([{ minutes: 21, seconds: 59 }, { minutes: 22, seconds: 0 }, { minutes: 22, seconds: 1 }, { minutes: 22, seconds: 2 }, { minutes: 22, seconds: 3 }]) })
it('parseUserInput H mmss around minute gaps', () => { expect(parseUserInput('2259-+2')).toStrictEqual([{ minutes: 22, seconds: 57 }, { minutes: 22, seconds: 58 }, { minutes: 22, seconds: 59 }, { minutes: 23, seconds: 0 }, { minutes: 23, seconds: 1 }]) })
it('parseUserInput I empty input', () => { expect(parseUserInput('')).toStrictEqual([]) })
it('parseUserInput J invalid input', () => { expect(parseUserInput('plop')).toStrictEqual([]) })
it('parseUserInput K invalid input', () => { expect(parseUserInput('12plop')).toStrictEqual([]) })
it('parseUserInput L invalid input', () => { expect(parseUserInput('plop12')).toStrictEqual([]) })
it('parseUserInput M specific mmss', () => { expect(parseUserInput('1234')).toStrictEqual([{ minutes: 12, seconds: 34 }]) })
it('parseUserInput N default to modulo 5 if marker exists', () => { expect(parseUserInput('1234+-')).toMatchSnapshot() })

it('readableDuration A', () => { expect(readableDuration(0)).toBe('00h00m00s') })
it('readableDuration B', () => { expect(readableDuration(28)).toBe('00h00m28s') })
it('readableDuration C', () => { expect(readableDuration(60)).toBe('00h01m00s') })
it('readableDuration D', () => { expect(readableDuration(61)).toBe('00h01m01s') })
it('readableDuration E', () => { expect(readableDuration(3600)).toBe('01h00m00s') })
it('readableDuration F', () => { expect(readableDuration(3612)).toBe('01h00m12s') })

it('readableSize A', () => { expect(readableSize(0)).toBe('0mo') })
it('readableSize B', () => { expect(readableSize(1000)).toBe('0mo') })
it('readableSize C', () => { expect(readableSize(1_000_000)).toBe('1mo') })
it('readableSize D', () => { expect(readableSize(1_000_000_000)).toBe('954mo') })
it('readableSize E', () => { expect(readableSize(1_000_000_000_000)).toBe('931,3go') })
it('readableSize F', () => { expect(readableSize(1_924_654_000)).toBe('1,8go') })

it('getScreenshotFilename A', () => { expect(getScreenshotFilename(3600, { duration: 789, height: 1080, size: 123_456_789, title: 'plop' })).toBe('plop 01h00m00s 118mo 1080p 00h13m09s.jpg') })
it('getScreenshotFilename B', () => { expect(getScreenshotFilename(126, { duration: 1_000_000, height: 720, size: 1_000_000_000, title: 'The little John and the Doe are awaiting the arrival of the big John (2013) Encoded by HurrayXXX_36 x265 10bit HDR DTS-HD-MA' })).toBe('The little John and the Doe are awaiting the arrival of the big John (2013) Encoded by HurrayXXX_36 x265 10bit HDR DTS-HD-MA 00h02m06s 954mo 720p 13h46m40s.jpg') })
it('getScreenshotFilename C', () => { expect(getScreenshotFilename(0, { duration: 0, height: 0, size: 0, title: '' })).toBe('00h00m00s 0mo 0p 00h00m00s.jpg') })

it('getFfmpegCommand A', () => { expect(getFfmpegCommand({ screenPath: 'plop.jpg', totalSeconds: 120, videoPath: 'plop.mp4' })).toBe('ffmpeg -ss 120 -i "plop.mp4" -frames:v 1 -q:v 1 "plop.jpg"') })

it('getTargets A', () => { expect(getTargets(5, 2, 30)).toMatchSnapshot() })
