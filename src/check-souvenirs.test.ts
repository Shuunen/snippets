import path from 'node:path'
import { invariant } from 'es-toolkit'
import { alignForSnap } from 'shuutils'

const mockUnlink = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockRename = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

vi.mock(import('node:fs/promises'), () => ({
  rename: mockRename,
  unlink: mockUnlink,
}))

// oxlint-disable-next-line typescript/no-explicit-any
const mockSpawnSync = vi.fn<() => any>().mockReturnValue({ error: undefined, status: 0, stdout: '' })

vi.mock(import('node:child_process'), () => ({
  spawnSync: mockSpawnSync,
}))

const mockGlob = vi.fn<() => Promise<string[]>>().mockResolvedValue([])

vi.mock(import('tiny-glob'), () => ({
  default: mockGlob,
}))

const mockSharpToFile = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockSharpJpeg = vi.fn<() => unknown>().mockReturnValue({ toFile: mockSharpToFile })
const mockSharp = vi.fn<() => unknown>().mockReturnValue({ jpeg: mockSharpJpeg })

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('sharp', () => ({
  default: mockSharp,
}))

const mockRead = vi.fn<() => Promise<unknown>>().mockResolvedValue({})
const mockWrite = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockRewriteAllTags = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockEnd = vi.fn<() => void>()

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('exiftool-vendored', () => ({
  ExifDateTime: class ExifDateTime {
    public year: number
    public month: number
    public day: number
    public hour: number
    public minute: number
    public second: number
    public millisecond: number
    public tzoffsetMinutes?: number
    public constructor(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number, tzoffsetMinutes?: number) {
      this.year = year
      this.month = month
      this.day = day
      this.hour = hour
      this.minute = minute
      this.second = second
      this.millisecond = millisecond
      this.tzoffsetMinutes = tzoffsetMinutes
    }
    public toDate() {
      return new Date(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.millisecond)
    }
    public toString() {
      return `${this.year}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')}T${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}:${String(this.second).padStart(2, '0')}`
    }
    public static fromISO(str: string) {
      const date = new Date(str)
      const tzMatch = /([+-])(\d{2}):(\d{2})$/.exec(str)
      let tzoffsetMinutes: number | undefined = undefined
      if (tzMatch) {
        const sign = tzMatch[1] === '+' ? 1 : -1
        const hours = Number.parseInt(tzMatch[2] ?? '0', 10)
        const minutes = Number.parseInt(tzMatch[3] ?? '0', 10)
        tzoffsetMinutes = sign * (hours * 60 + minutes)
      }
      return new ExifDateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds(), tzoffsetMinutes)
    }
  },
  ExifTool: class ExifTool {
    public [Symbol.asyncDispose] = mockEnd
    public end = mockEnd
    public read = mockRead
    public rewriteAllTags = mockRewriteAllTags
    public write = mockWrite
  },
}))

// Import after mocks are set up
const {
  checkFile,
  checkFileDate,
  checkFilePathExtensionCase,
  checkFilePathExtensionMp,
  checkFilePathSpecialCharacters,
  checkFiles,
  checkPngTransparency,
  cleanFilePath,
  count,
  dateFromPath,
  getExifDateFromSiblings,
  getExifDateFromYearAndMonth,
  getFiles,
  getNewExifDateBasedOnExistingDate,
  isPhoto,
  isMkvToolAvailable,
  logger,
  resetMkvToolCache,
  setFileDateBasedOnSiblings,
  setFileDate,
  setFileDateViaMkvTool,
  showReport,
  start,
  toDate,
} = await import('./check-souvenirs.cli')
const { ExifDateTime } = await import('exiftool-vendored')

describe('check-souvenirs.cli', () => {
  beforeEach(() => {
    mockRead.mockResolvedValue({})
    mockWrite.mockResolvedValue(undefined)
    mockRewriteAllTags.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)
    mockRename.mockResolvedValue(undefined)
    mockGlob.mockResolvedValue([])
    mockSharpToFile.mockResolvedValue(undefined)
    mockSharpJpeg.mockReturnValue({ toFile: mockSharpToFile })
    mockSharp.mockReturnValue({ jpeg: mockSharpJpeg })
    mockSpawnSync.mockReturnValue({ error: undefined, status: 0, stdout: '' })
    count.conversions = 0
    count.dateFixes = 0
    count.errors = 0
    count.scanned = 0
    count.skipped = 0
    count.specialCharsFixes = 0
    count.warnings = 0
    logger.inMemoryLogs = [] // clear in-memory logs before each test
    logger.options.willOutputToConsole = false
    resetMkvToolCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const dateFromPathTests = [
    {
      description: 'A regular case with year and month',
      input: 'D:\\Souvenirs\\2006\\2006-08_House Foobar\\P1000068.jpg',
      output: { month: '08', year: '2006' },
    },
    {
      description: 'B regular case with only year',
      input: 'D:\\Souvenirs\\2006\\Me puissance 10.jpg',
      output: { month: undefined, year: '2006' },
    },
    {
      description: 'C regular case with 00 month',
      input: 'D:\\Souvenirs\\2006\\2006-00_Term Mont-topaz-photo-lighting-face-upscale-2x.jpeg',
      output: { month: undefined, year: '2006' },
    },
    {
      description: 'D irregular case with no year or month',
      input: 'D:\\Souvenirs\\Miscellaneous\\random-file.png',
      output: { month: undefined, year: undefined },
    },
    {
      description: 'E date in path and different one in file name',
      input: 'D:\\Souvenirs\\2016\\2016-10_Sydney\\Darling Harbour and around\\2016-11-01 14-21-22_513809296_-Acer.jpg',
      output: { month: '10', year: '2016' },
    },
  ]

  for (const test of dateFromPathTests)
    it(`dateFromPath ${test.description}`, () => {
      const result = dateFromPath(test.input)
      if (!result.ok) throw new Error('Expected ok result')
      expect(result.value).toStrictEqual(test.output)
    })

  it('getFiles A should return list of files', async () => {
    mockGlob.mockResolvedValue(['file1.jpg', 'file2.png'])
    const files = await getFiles()
    expect(files).toMatchInlineSnapshot(`
      [
        "file1.jpg",
        "file2.png",
      ]
    `)
  })

  it('toDate A should convert ExifDateTime to Date', () => {
    const exifDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    const date = toDate(exifDate)
    expect(date).toBeInstanceOf(Date)
    expect(date.getFullYear()).toBe(2006)
  })

  it('toDate B should convert string to Date', () => {
    const date = toDate('2006-08-15T12:30:45')
    expect(date).toBeInstanceOf(Date)
  })

  it('getExifDateFromSiblings A should return ExifDateTime from previous sibling', async () => {
    const siblingDate = new ExifDateTime(2006, 8, 14, 10, 20, 30, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: siblingDate })
    const result = await getExifDateFromSiblings({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
    })
    expect(result).toBeInstanceOf(ExifDateTime)
    expect(result?.year).toBe(2006)
  })

  it('getExifDateFromSiblings B should convert string DateTimeOriginal to ExifDateTime', async () => {
    mockRead.mockResolvedValue({ DateTimeOriginal: '2006-08-14T10:20:30' })
    const result = await getExifDateFromSiblings({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
    })
    expect(result).toBeInstanceOf(ExifDateTime)
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(8)
  })

  it('getExifDateFromSiblings C should return undefined when no siblings have dates', async () => {
    mockRead.mockResolvedValue({})
    const result = await getExifDateFromSiblings({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\next.jpg`,
      previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
    })
    expect(result).toBeUndefined()
  })

  it('getNewExifDateBasedOnExistingDate A should use path year when exifYearIncorrect is true and pathYear exists', () => {
    const originalExifDate = new ExifDateTime(2005, 8, 15, 12, 30, 45, 0)
    const exifDate = new Date(2005, 7, 15, 12, 30, 45, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: false,
      exifYearIncorrect: true,
      originalExifDate,
      pathMonth: undefined,
      pathYear: '2006',
    })
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(8)
  })

  it('getNewExifDateBasedOnExistingDate B should use path month when exifMonthIncorrect is true and pathMonth exists', () => {
    const originalExifDate = new ExifDateTime(2006, 7, 15, 12, 30, 45, 0)
    const exifDate = new Date(2006, 6, 15, 12, 30, 45, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: '08',
      pathYear: '2006',
    })
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(8)
  })

  it('getNewExifDateBasedOnExistingDate C should use originalExifDate when exifYearIncorrect is false', () => {
    const originalExifDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    const exifDate = new Date(2006, 7, 15, 12, 30, 45, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: false,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: undefined,
      pathYear: '2006',
    })
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(8)
  })

  it('getNewExifDateBasedOnExistingDate D should use exifDate when originalExifDate is undefined', () => {
    const exifDate = new Date(2006, 7, 15, 12, 30, 45, 100)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: false,
      exifYearIncorrect: false,
      originalExifDate: undefined,
      pathMonth: undefined,
      pathYear: undefined,
    })
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(8)
    expect(result?.day).toBe(15)
    expect(result?.hour).toBe(12)
    expect(result?.minute).toBe(30)
    expect(result?.second).toBe(45)
    expect(result?.millisecond).toBe(100)
  })

  it('getNewExifDateBasedOnExistingDate E should handle both year and month corrections', () => {
    const originalExifDate = new ExifDateTime(2005, 7, 15, 12, 30, 45, 0)
    const exifDate = new Date(2005, 6, 15, 12, 30, 45, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: true,
      originalExifDate,
      pathMonth: '08',
      pathYear: '2006',
    })
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(8)
  })

  it('getNewExifDateBasedOnExistingDate F should use exifDate year when exifYearIncorrect is true but pathYear is undefined', () => {
    const originalExifDate = new ExifDateTime(2005, 8, 15, 12, 30, 45, 0)
    const exifDate = new Date(2005, 7, 15, 12, 30, 45, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: false,
      exifYearIncorrect: true,
      originalExifDate,
      pathMonth: undefined,
      pathYear: undefined,
    })
    expect(result?.year).toBe(2005)
  })

  it('getNewExifDateBasedOnExistingDate G should use exifDate month when exifMonthIncorrect is true but pathMonth is undefined', () => {
    const originalExifDate = new ExifDateTime(2006, 7, 15, 12, 30, 45, 0)
    const exifDate = new Date(2006, 6, 15, 12, 30, 45, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: undefined,
      pathYear: '2006',
    })
    expect(result?.month).toBe(7)
  })

  it('getNewExifDateBasedOnExistingDate H should adjust day 31 to 30 when changing month from October to November', () => {
    const originalExifDate = new ExifDateTime(2023, 10, 31, 17, 51, 15, 193, 60)
    const exifDate = new Date(2023, 9, 31, 17, 51, 15, 193)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: '11',
      pathYear: '2023',
    })
    expect(result?.year).toBe(2023)
    expect(result?.month).toBe(11)
    expect(result?.day).toBe(30)
    expect([16, 17]).toContain(result?.hour)
    expect(result?.minute).toBe(51)
    expect(result?.second).toBe(15)
  })

  it('getNewExifDateBasedOnExistingDate I should adjust day 31 to 28 when changing month to February in non-leap year', () => {
    const originalExifDate = new ExifDateTime(2023, 1, 31, 10, 0, 0, 0, 0)
    const exifDate = new Date(2023, 0, 31, 10, 0, 0, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: '02',
      pathYear: '2023',
    })
    expect(result?.year).toBe(2023)
    expect(result?.month).toBe(2)
    expect(result?.day).toBe(28)
  })

  it('getNewExifDateBasedOnExistingDate J should adjust day 31 to 29 when changing month to February in leap year', () => {
    const originalExifDate = new ExifDateTime(2024, 1, 31, 10, 0, 0, 0, 0)
    const exifDate = new Date(2024, 0, 31, 10, 0, 0, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: '02',
      pathYear: '2024',
    })
    expect(result?.year).toBe(2024)
    expect(result?.month).toBe(2)
    expect(result?.day).toBe(29)
  })

  it('getNewExifDateBasedOnExistingDate K should not adjust day when it is valid for the target month', () => {
    const originalExifDate = new ExifDateTime(2023, 10, 15, 12, 0, 0, 0, 0)
    const exifDate = new Date(2023, 9, 15, 12, 0, 0, 0)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: '11',
      pathYear: '2023',
    })
    expect(result?.year).toBe(2023)
    expect(result?.month).toBe(11)
    expect(result?.day).toBe(15)
  })

  it('getNewExifDateBasedOnExistingDate L should preserve timezone offset when adjusting date', () => {
    const originalExifDate = new ExifDateTime(2023, 10, 31, 17, 51, 15, 193, 60)
    const exifDate = new Date(2023, 9, 31, 17, 51, 15, 193)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: true,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: '11',
      pathYear: '2023',
    })
    expect(result?.tzoffsetMinutes).toBe(60)
  })

  it('getNewExifDateBasedOnExistingDate M should handle negative timezone offset', () => {
    const originalExifDate = new ExifDateTime(2023, 10, 31, 17, 51, 15, 193, -300)
    const exifDate = new Date(2023, 9, 31, 17, 51, 15, 193)
    const result = getNewExifDateBasedOnExistingDate({
      exifDate,
      exifMonthIncorrect: false,
      exifYearIncorrect: false,
      originalExifDate,
      pathMonth: '10',
      pathYear: '2023',
    })
    expect(result?.tzoffsetMinutes).toBe(-300)
  })

  it('setFileDate A should set photo date successfully on first attempt', async () => {
    mockWrite.mockResolvedValue(undefined)
    const exifDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    await setFileDate('test.jpg', exifDate)
    expect(mockWrite).toHaveBeenCalledWith('test.jpg', { DateTimeOriginal: exifDate })
    expect(count.dateFixes).toBe(1)
  })

  it('setFileDate B should handle write failure and retry with rewriteAllTags', async () => {
    mockWrite.mockRejectedValueOnce(new Error('Write failed')).mockResolvedValueOnce(undefined)
    const exifDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    await setFileDate('test.jpg', exifDate)
    expect(mockRewriteAllTags).toHaveBeenCalledWith('test.jpg', 'test.jpg.new')
    expect(mockWrite).toHaveBeenCalledTimes(2)
    expect(count.dateFixes).toBe(1)
  })

  it('setFileDate C should handle write failure twice', async () => {
    mockWrite.mockRejectedValue(new Error('Write failed'))
    const exifDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    await setFileDate('test.jpg', exifDate)
    expect(mockWrite).toHaveBeenCalledTimes(2)
    expect(count.dateFixes).toBe(0)
  })

  it('setFileDate D should handle undefined date', async () => {
    mockWrite.mockResolvedValue(undefined)
    await setFileDate('test.jpg', undefined as never)
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('setFileDate E should handle unsupported file type', async () => {
    const exifDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    await setFileDate('test.mp4', exifDate)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Cannot set date for unsupported file type'))).toBe(true)
  })

  it('setFileDate F should handle Matroska video file', async () => {
    mockSpawnSync.mockReturnValueOnce({ error: undefined, status: 0, stdout: 'mkvpropedit v1.0.0' })
    const exifDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    await setFileDate('test.mkv', exifDate)
    expect(mockSpawnSync).toHaveBeenCalledWith('mkvpropedit.exe', ['test.mkv', '--edit', 'info', '--set', 'date=2006-08-15'], { encoding: 'utf8' })
    expect(count.dateFixes).toBe(1)
  })

  it('checkFileDate A should handle file without DateTimeOriginal', async () => {
    mockRead.mockResolvedValue({})
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockRead).toHaveBeenCalled()
  })

  it('checkFileDate B should handle year mismatch', async () => {
    const originalDate = new ExifDateTime(2005, 8, 15, 12, 30, 45, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: originalDate })
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockWrite).toHaveBeenCalled()
  })

  it('checkFileDate C should handle month mismatch', async () => {
    const originalDate = new ExifDateTime(2006, 7, 15, 12, 30, 45, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: originalDate })
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockWrite).toHaveBeenCalled()
  })

  it('checkFileDate D should handle both year and month mismatch', async () => {
    const originalDate = new ExifDateTime(2005, 7, 15, 12, 30, 45, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: originalDate })
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockWrite).toHaveBeenCalled()
  })

  it('checkFileDate E should handle string DateTimeOriginal', async () => {
    mockRead.mockResolvedValue({ DateTimeOriginal: '2005-08-15T12:30:45' })
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockWrite).toHaveBeenCalled()
  })

  it('checkFileDate F should handle correct date', async () => {
    const correctDate = new ExifDateTime(2006, 8, 15, 12, 30, 45, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: correctDate })
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('checkFileDate G should handle year mismatch with no path year', async () => {
    const originalDate = new ExifDateTime(2005, 8, 15, 12, 30, 45, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: originalDate })
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\random.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('checkFileDate H should handle month mismatch with no path month', async () => {
    const originalDate = new ExifDateTime(2006, 7, 15, 12, 30, 45, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: originalDate })
    await checkFileDate({
      currentFilePath: String.raw`D:\Souvenirs\2006\random.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(mockWrite).not.toHaveBeenCalled()
  })

  it('setFileDateBasedOnSiblings A should set date from previous sibling', async () => {
    const siblingDate = new ExifDateTime(2006, 8, 14, 10, 20, 30, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: siblingDate })
    await setFileDateBasedOnSiblings(
      {
        currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
        nextFilePath: '',
        previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
      },
      '2006',
      '08',
    )
    expect(mockWrite).toHaveBeenCalled()
  })

  it('setFileDateBasedOnSiblings B should set date from next sibling', async () => {
    const siblingDate = new ExifDateTime(2006, 8, 16, 14, 25, 35, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: siblingDate })
    await setFileDateBasedOnSiblings(
      {
        currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
        nextFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\next.jpg`,
        previousFilePath: '',
      },
      '2006',
      '08',
    )
    expect(mockWrite).toHaveBeenCalled()
  })

  it('setFileDateBasedOnSiblings C should handle no siblings with dates', async () => {
    mockRead.mockResolvedValue({})
    await setFileDateBasedOnSiblings(
      {
        currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
        nextFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\next.jpg`,
        previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
      },
      '2006',
      '08',
    )
    expect(mockWrite).toHaveBeenCalled()
    const lastCall = mockWrite.mock.calls.at(-1)
    invariant(lastCall, 'Expected at least one call to mockWrite')
    expect(JSON.stringify(lastCall).split('tzoffsetMinutes')[0]).toMatchInlineSnapshot(
      `"["D:\\\\Souvenirs\\\\2006\\\\2006-08_House\\\\test.jpg",{"DateTimeOriginal":{"year":2006,"month":8,"day":1,"hour":0,"minute":0,"second":0,"millisecond":0,""`,
    )
  })

  it('setFileDateBasedOnSiblings D should correct year from sibling date', async () => {
    const siblingDate = new ExifDateTime(2005, 8, 14, 10, 20, 30, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: siblingDate })
    await setFileDateBasedOnSiblings(
      {
        currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
        nextFilePath: '',
        previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
      },
      '2006',
      '08',
    )
    expect(mockWrite).toHaveBeenCalled()
    const writeCall = mockWrite.mock.calls.at(0)
    // @ts-expect-error typing issue
    expect(writeCall?.[1].DateTimeOriginal.year).toBe(2006)
  })

  it('setFileDateBasedOnSiblings E should correct month from sibling date', async () => {
    const siblingDate = new ExifDateTime(2006, 7, 14, 10, 20, 30, 0)
    mockRead.mockResolvedValue({ DateTimeOriginal: siblingDate })
    await setFileDateBasedOnSiblings(
      {
        currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
        nextFilePath: '',
        previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
      },
      '2006',
      '08',
    )
    expect(mockWrite).toHaveBeenCalled()
    const writeCall = mockWrite.mock.calls.at(0)
    // @ts-expect-error typing issue
    expect(writeCall?.[1].DateTimeOriginal.month).toBe(8)
  })

  it('setFileDateBasedOnSiblings F should handle string DateTimeOriginal from sibling', async () => {
    mockRead.mockResolvedValue({ DateTimeOriginal: '2006-08-14T10:20:30' })
    await setFileDateBasedOnSiblings(
      {
        currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`,
        nextFilePath: '',
        previousFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\prev.jpg`,
      },
      '2006',
      '08',
    )
    expect(mockWrite).toHaveBeenCalled()
  })

  it('setFileDateBasedOnSiblings G should handle no siblings', async () => {
    await setFileDateBasedOnSiblings({ currentFilePath: String.raw`D:\Souvenirs\2006\2006-08_House\test.jpg`, nextFilePath: '', previousFilePath: '' }, '2007', '08')
    expect(mockWrite).toHaveBeenCalled()
  })

  it('checkFile A should check file and update count', async () => {
    mockRead.mockResolvedValue({})
    await checkFile({
      currentFilePath: String.raw`D:\Souvenirs\2006\test.jpg`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(count.scanned).toBe(1)
  })

  it('checkFile B should check non-photo files', async () => {
    mockRead.mockResolvedValue({})
    await checkFile({
      currentFilePath: String.raw`D:\Souvenirs\2006\video.mp4`,
      nextFilePath: '',
      previousFilePath: '',
    })
    expect(count.scanned).toBe(1)
  })

  it('checkFiles A should process all files', async () => {
    mockRead.mockResolvedValue({})
    await checkFiles(['file1.jpg', 'file2.jpg'])
    expect(count.scanned).toBe(2)
  })

  it('checkFiles B should process all files when --process-one not set', async () => {
    mockRead.mockResolvedValue({})
    await checkFiles(['file1.jpg', 'file2.jpg'])
    expect(count.scanned).toBe(2)
  })

  it('showReport A should display report with no issues', () => {
    count.scanned = 10
    count.dateFixes = 5
    count.errors = 0
    count.warnings = 0
    showReport()
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('0 errors'))).toBe(true)
  })

  it('showReport B should display report with errors', () => {
    count.scanned = 10
    count.dateFixes = 5
    logger.error('Test error')
    showReport()
    expect(count.errors).toBe(1)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Some issues were found'))).toBe(true)
  })

  it('showReport C should display report with warnings', () => {
    count.scanned = 10
    count.dateFixes = 5
    logger.warn('Test warning')
    showReport()
    expect(count.warnings).toBe(1)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Some issues were found'))).toBe(true)
  })

  it('showReport D should display report with conversions and special chars fixes', () => {
    count.scanned = 10
    count.dateFixes = 5
    count.conversions = 2
    count.specialCharsFixes = 3
    count.errors = 0
    count.warnings = 0
    showReport()
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Nice no issues found'))).toBe(true)
  })

  it('showReport E should display report with zero scanned files', () => {
    count.scanned = 0
    count.dateFixes = 0
    count.conversions = 0
    count.specialCharsFixes = 0
    count.errors = 0
    count.warnings = 0
    showReport()
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Nice no issues found'))).toBe(true)
  })

  it('showReport F should display report with skipped files', () => {
    count.scanned = 10
    count.skipped = 3
    count.dateFixes = 0
    count.conversions = 0
    count.specialCharsFixes = 0
    count.errors = 0
    count.warnings = 0
    showReport()
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('3') && log.includes('files skipped'))).toBe(true)
  })

  it('start A should execute full workflow', async () => {
    mockGlob.mockResolvedValue(['file1.jpg'])
    mockRead.mockResolvedValue({})
    await start()
    expect(count.scanned).toBe(1)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Check Souvenirs is done'))).toBe(true)
  })

  it('checkFilePathExtensionCase A should handle lowercase extension', async () => {
    const result = await checkFilePathExtensionCase(String.raw`D:\Souvenirs\test.jpg`)
    expect(result).toBe(String.raw`D:\Souvenirs\test.jpg`)
  })

  it('checkFilePathExtensionCase B should rename uppercase extension to lowercase', async () => {
    const result = await checkFilePathExtensionCase(String.raw`D:\Souvenirs\test.JPG`)
    expect(mockRename).toHaveBeenCalledTimes(2)
    expect(result).toBe(String.raw`D:\Souvenirs\test.jpg`)
  })

  it('checkFilePathExtensionMp A should handle non-mp extension', async () => {
    const result = await checkFilePathExtensionMp(String.raw`D:\Souvenirs\test.jpg`)
    expect(result).toBe(String.raw`D:\Souvenirs\test.jpg`)
  })

  it('checkFilePathExtensionMp B should rename mp extension to mp4', async () => {
    const result = await checkFilePathExtensionMp(String.raw`D:\Souvenirs\test.mp`)
    expect(mockRename).toHaveBeenCalledOnce()
    expect(result).toBe(String.raw`D:\Souvenirs\test.mp4`)
  })

  it('checkFilePathSpecialCharacters A should handle files without special characters', async () => {
    const inputPath = path.normalize('/Souvenirs/test.jpg')
    const result = await checkFilePathSpecialCharacters(inputPath)
    expect(alignForSnap(result)).toBe(alignForSnap(inputPath))
    expect(mockRename).not.toHaveBeenCalled()
  })

  it('checkFilePathSpecialCharacters B should rename files with special characters', async () => {
    const inputPath = path.normalize('/Souvenirs/test@file.jpg')
    const expectedPath = path.normalize('/Souvenirs/test-file.jpg')
    const result = await checkFilePathSpecialCharacters(inputPath)
    expect(mockRename).toHaveBeenCalledOnce()
    expect(alignForSnap(result)).toBe(alignForSnap(expectedPath))
  })

  it('checkPngTransparency A should skip non-PNG files', async () => {
    await checkPngTransparency(String.raw`D:\Souvenirs\test.jpg`)
    expect(mockRead).not.toHaveBeenCalled()
  })

  it('checkPngTransparency B should warn about PNG without ColorType tag', async () => {
    mockRead.mockResolvedValue({})
    await checkPngTransparency(String.raw`D:\Souvenirs\test.png`)
    expect(mockRead).toHaveBeenCalled()
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('No ColorType tag found'))).toBe(true)
  })

  it('checkPngTransparency C should warn about RGB PNG without transparency', async () => {
    mockRead.mockResolvedValue({ ColorType: 'RGB' })
    await checkPngTransparency(String.raw`D:\Souvenirs\test.png`)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('PNG file without transparency detected'))).toBe(true)
    expect(mockSharp).toHaveBeenCalledWith(String.raw`D:\Souvenirs\test.png`)
    expect(mockSharpJpeg).toHaveBeenCalledWith({ quality: 90 })
    expect(mockSharpToFile).toHaveBeenCalledWith(String.raw`D:\Souvenirs\test.jpg`)
    expect(mockUnlink).toHaveBeenCalledWith(String.raw`D:\Souvenirs\test.png`)
  })

  it('checkPngTransparency D should not warn about PNG with RGBA ColorType', async () => {
    mockRead.mockResolvedValue({ ColorType: 'RGBA' })
    await checkPngTransparency(String.raw`D:\Souvenirs\test.png`)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('PNG file without transparency'))).toBe(false)
  })

  it('cleanFilePath A should warn about special characters in the path', () => {
    const inputPath = '/Souvenirs/2006/2006-00_Super test@@@!folder/pic.png'
    cleanFilePath(inputPath)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('contains forbidden characters'))).toBe(true)
  })

  it('cleanFilePath B should rename file with special characters', () => {
    const inputPath = 'test!2!!&@*(file#.jpg'
    const result = cleanFilePath(inputPath)
    expect(result).toMatchInlineSnapshot(`"test-2-file.jpg"`)
  })

  it('getExifDateFromYearAndMonth A should return ExifDateTime for valid year and month', () => {
    const result = getExifDateFromYearAndMonth('2006', '08')
    expect(result).toBeInstanceOf(ExifDateTime)
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(8)
    expect(result?.day).toBe(1)
  })

  it('getExifDateFromYearAndMonth B should return ExifDateTime for valid year without month', () => {
    const result = getExifDateFromYearAndMonth('2006', undefined)
    expect(result).toBeInstanceOf(ExifDateTime)
    expect(result?.year).toBe(2006)
    expect(result?.month).toBe(1)
    expect(result?.day).toBe(1)
  })

  it('isPhoto A should return true for jpg extension', () => {
    const result = isPhoto('test.jpg')
    expect(result).toBe(true)
  })

  it('isPhoto B should return true for jpeg extension', () => {
    const result = isPhoto('test.jpeg')
    expect(result).toBe(true)
  })

  it('isPhoto C should return true for png extension', () => {
    const result = isPhoto('test.png')
    expect(result).toBe(true)
  })

  it('isPhoto D should return true for uppercase JPG extension', () => {
    const result = isPhoto('test.JPG')
    expect(result).toBe(true)
  })

  it('isPhoto E should return false for mp4 extension', () => {
    const result = isPhoto('test.mp4')
    expect(result).toBe(false)
  })

  it('isPhoto F should return false for mp extension', () => {
    const result = isPhoto('test.mp')
    expect(result).toBe(false)
  })

  it('isPhoto G should return false for txt extension', () => {
    const result = isPhoto('test.txt')
    expect(result).toBe(false)
  })

  it('isMkvToolAvailable A should return false when mkvpropedit throws an error', () => {
    mockSpawnSync.mockReturnValueOnce({ error: new Error('Command not found'), status: 1, stdout: '' })
    const result = isMkvToolAvailable()
    expect(result).toBe(false)
    expect(mockSpawnSync).toHaveBeenCalledWith('mkvpropedit.exe', ['--version'], { encoding: 'utf8' })
  })

  it('isMkvToolAvailable B should handle non-Error exceptions', () => {
    mockSpawnSync.mockReturnValueOnce({ error: 'string error', status: 1, stdout: '' })
    const result = isMkvToolAvailable()
    expect(result).toBe(false)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Version test failed') && log.includes('string error'))).toBe(true)
  })

  it('setFileDateViaMkvTool A should handle tool not available', () => {
    mockSpawnSync.mockReturnValueOnce({ error: new Error('Command not found'), status: 1, stdout: '' })
    setFileDateViaMkvTool(String.raw`D:\Souvenirs\2006\video.mkv`, '2006-01-01')
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Cannot set date because') && log.includes('tool is not available'))).toBe(true)
  })

  it('isMkvToolAvailable C should cache and return true when mkvpropedit is available', () => {
    mockSpawnSync.mockReturnValueOnce({ error: undefined, status: 0, stdout: 'mkvpropedit v1.0.0' })
    const result1 = isMkvToolAvailable()
    expect(result1).toBe(true)
    const result2 = isMkvToolAvailable()
    expect(result2).toBe(true)
    expect(mockSpawnSync).toHaveBeenCalledOnce()
  })

  it('setFileDateViaMkvTool B should set date successfully when tool is available', () => {
    count.dateFixes = 0
    mockSpawnSync.mockReturnValueOnce({ error: undefined, status: 0, stdout: 'mkvpropedit v1.0.0' })
    const resultAvailable = isMkvToolAvailable()
    expect(resultAvailable).toBe(true)
    mockSpawnSync.mockReturnValueOnce({ error: undefined, status: 0, stdout: '' })
    setFileDateViaMkvTool(String.raw`D:\Souvenirs\2006\video.mkv`, '2006-01-01')
    expect(mockSpawnSync).toHaveBeenLastCalledWith('mkvpropedit.exe', [String.raw`D:\Souvenirs\2006\video.mkv`, '--edit', 'info', '--set', 'date=2006-01-01'], { encoding: 'utf8' })
    expect(count.dateFixes).toBe(1)
  })

  it('setFileDateViaMkvTool C should handle non-zero exit status', () => {
    mockSpawnSync.mockReturnValueOnce({ error: undefined, status: 0, stdout: 'mkvpropedit v1.0.0' })
    isMkvToolAvailable()
    mockSpawnSync.mockReturnValueOnce({ error: undefined, status: 1, stderr: 'File not found', stdout: '' })
    setFileDateViaMkvTool(String.raw`D:\Souvenirs\2006\video.mkv`, '2006-01-01')
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Failed to set date, mkvpropedit exited with'))).toBe(true)
  })

  it('setFileDateViaMkvTool D should handle spawnSync error', () => {
    mockSpawnSync.mockReturnValueOnce({ error: undefined, status: 0, stdout: 'mkvpropedit v1.0.0' })
    isMkvToolAvailable()
    mockSpawnSync.mockReturnValueOnce({ error: new Error('Spawn failed'), status: 1, stdout: '' })
    setFileDateViaMkvTool(String.raw`D:\Souvenirs\2006\video.mkv`, '2006-01-01')
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Failed to set date for file') && log.includes('using mkvpropedit'))).toBe(true)
  })
})
