import { check, checkSnapshot } from '../tests/test-utils'
import { emptyMetadata, getFfmpegCommand, getScreenshotFilename, getTargets, parseUserInput, parseVideoMetadata, readableDuration, readableSize } from './take-screenshot.utils'

const ffProbeOutputA = { streams: [] }

check('parseVideoMetadata A', parseVideoMetadata(ffProbeOutputA), emptyMetadata)

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
    duration: '',
    height: 0,
    width: 0,
  }, {
    avg_frame_rate: '25/1', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_name: 'h264', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_type: 'video', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: '00:00:00.000000',
    height: 1080,
    width: 1920,
  }],
}

const expectedMetadataB = {
  duration: 789,
  height: 1080,
  size: 123_456,
  title: 'plop and the doe',
}

check('parseVideoMetadata B', parseVideoMetadata(ffProbeOutputB), expectedMetadataB)

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
    duration: '',
    height: 0,
    width: 0,
  }],
}

check('parseVideoMetadata C', parseVideoMetadata(ffProbeOutputCnoVideo), emptyMetadata)

const ffProbeOutputDnoFormat = {
  streams: [{
    avg_frame_rate: '25/1', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_name: 'h264', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    codec_type: 'video', // eslint-disable-line @typescript-eslint/naming-convention, camelcase
    duration: '12',
    height: 720,
    width: 1280,
  }],
}

const expectedMetadataD = {
  duration: 0,
  height: 720,
  size: 0,
  title: '',
}

check('parseVideoMetadata D', parseVideoMetadata(ffProbeOutputDnoFormat), expectedMetadataD)

check('parseUserInput A specific ss', parseUserInput('12'), [{ minutes: 0, seconds: 12 }])
check('parseUserInput B ss+-1', parseUserInput('12+-1'), [{ minutes: 0, seconds: 11 }, { minutes: 0, seconds: 12 }, { minutes: 0, seconds: 13 }])
check('parseUserInput C mmss+-2', parseUserInput('2106+-2'), [{ minutes: 21, seconds: 4 }, { minutes: 21, seconds: 5 }, { minutes: 21, seconds: 6 }, { minutes: 21, seconds: 7 }, { minutes: 21, seconds: 8 }])
check('parseUserInput D mmss around minute gaps', parseUserInput('0100-+1'), [{ minutes: 0, seconds: 59 }, { minutes: 1, seconds: 0 }, { minutes: 1, seconds: 1 }])
check('parseUserInput E mmss around minute gaps', parseUserInput('0100-+2'), [{ minutes: 0, seconds: 58 }, { minutes: 0, seconds: 59 }, { minutes: 1, seconds: 0 }, { minutes: 1, seconds: 1 }, { minutes: 1, seconds: 2 }])
check('parseUserInput F mmss around minute gaps', parseUserInput('0100-+3'), [{ minutes: 0, seconds: 57 }, { minutes: 0, seconds: 58 }, { minutes: 0, seconds: 59 }, { minutes: 1, seconds: 0 }, { minutes: 1, seconds: 1 }, { minutes: 1, seconds: 2 }, { minutes: 1, seconds: 3 }])
check('parseUserInput G mmss around minute gaps', parseUserInput('2201-+2'), [{ minutes: 21, seconds: 59 }, { minutes: 22, seconds: 0 }, { minutes: 22, seconds: 1 }, { minutes: 22, seconds: 2 }, { minutes: 22, seconds: 3 }])
check('parseUserInput H mmss around minute gaps', parseUserInput('2259-+2'), [{ minutes: 22, seconds: 57 }, { minutes: 22, seconds: 58 }, { minutes: 22, seconds: 59 }, { minutes: 23, seconds: 0 }, { minutes: 23, seconds: 1 }])
check('parseUserInput I empty input', parseUserInput(''), [])
check('parseUserInput J invalid input', parseUserInput('plop'), [])
check('parseUserInput K invalid input', parseUserInput('12plop'), [])
check('parseUserInput L invalid input', parseUserInput('plop12'), [])
check('parseUserInput M specific mmss', parseUserInput('1234'), [{ minutes: 12, seconds: 34 }])
check('parseUserInput N default to modulo 5 if marker exists', parseUserInput('1234+-'), [{ minutes: 12, seconds: 29 }, { minutes: 12, seconds: 30 }, { minutes: 12, seconds: 31 }, { minutes: 12, seconds: 32 }, { minutes: 12, seconds: 33 }, { minutes: 12, seconds: 34 }, { minutes: 12, seconds: 35 }, { minutes: 12, seconds: 36 }, { minutes: 12, seconds: 37 }, { minutes: 12, seconds: 38 }, { minutes: 12, seconds: 39 }])

check('readableDuration A', readableDuration(0), '00h00m00s')
check('readableDuration B', readableDuration(28), '00h00m28s')
check('readableDuration C', readableDuration(60), '00h01m00s')
check('readableDuration D', readableDuration(61), '00h01m01s')
check('readableDuration E', readableDuration(3600), '01h00m00s')
check('readableDuration F', readableDuration(3612), '01h00m12s')

check('readableSize A', readableSize(0), '0mo')
check('readableSize B', readableSize(1000), '0mo')
check('readableSize C', readableSize(1_000_000), '1mo')
check('readableSize D', readableSize(1_000_000_000), '954mo')
check('readableSize E', readableSize(1_000_000_000_000), '931,3go')
check('readableSize F', readableSize(1_924_654_000), '1,8go')

check('getScreenshotFilename A', getScreenshotFilename(3600, { duration: 789, height: 1080, size: 123_456_789, title: 'plop' }), 'plop 01h00m00s 118mo 1080p 00h13m09s.jpg')
check('getScreenshotFilename B', getScreenshotFilename(126, { duration: 1_000_000, height: 720, size: 1_000_000_000, title: 'The little John and the Doe are awaiting the arrival of the big John (2013) Encoded by HurrayXXX_36 x265 10bit HDR DTS-HD-MA' }), 'The little John and the Doe are awaiting the arrival of the big John (2013) Encoded by HurrayXXX_36 x265 10bit HDR DTS-HD-MA 00h02m06s 954mo 720p 13h46m40s.jpg')
check('getScreenshotFilename C', getScreenshotFilename(0, { duration: 0, height: 0, size: 0, title: '' }), '00h00m00s 0mo 0p 00h00m00s.jpg')

check('getFfmpegCommand A', getFfmpegCommand({ screenPath: 'plop.jpg', totalSeconds: 120, videoPath: 'plop.mp4' }), 'ffmpeg -ss 120 -i "plop.mp4" -frames:v 1 -q:v 1 "plop.jpg"')

checkSnapshot('getTargets A', getTargets(5, 2, 30))
