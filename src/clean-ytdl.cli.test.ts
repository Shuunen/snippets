import * as fs from 'node:fs'
import { checkFile, checkFiles, cleanFileName, count, currentFolder, deleteFile, fileExists, getFiles, logger, options, renameFile, resetCount, shouldDelete, showReport, start } from './clean-ytdl.cli'

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('node:fs')

describe('clean-ytdl', () => {
  beforeEach(() => {
    resetCount()
    logger.options.willOutputToConsole = false // disable console output for tests
    logger.options.willLogTime = false // disable time logging for tests
    logger.options.willLogDelay = false // disable delay logging for tests
    logger.inMemoryLogs = [] // clear in-memory logs before each test
    options.dry = false // set dry mode to false, the default state
    vi.clearAllMocks()
  })

  it('cleanFileName A should remove quality and codec information from video files', () => {
    expect(cleanFileName('video (2160p_25fps_AV1-128kbit_AAC-French).mp4')).toMatchInlineSnapshot(`"video.mp4"`)
    expect(cleanFileName('movie (1080p_30fps_H264-256kbit_AAC).mkv')).toMatchInlineSnapshot(`"movie.mkv"`)
  })

  it('cleanFileName B should handle subtitle files with language markers', () => {
    expect(cleanFileName('video (English_ASR).srt')).toMatchInlineSnapshot(`"video.en.srt"`)
    expect(cleanFileName('movie (English).srt')).toMatchInlineSnapshot(`"movie.en.srt"`)
    expect(cleanFileName('show.English.srt')).toMatchInlineSnapshot(`"show.en.srt"`)
  })

  it('cleanFileName C should remove fake extensions and special characters', () => {
    expect(cleanFileName('file.exe.mp4')).toMatchInlineSnapshot(`"file.mp4"`)
    expect(cleanFileName('video (info) [tag].mp4')).toMatchInlineSnapshot(`"video info tag.mp4"`)
    expect(cleanFileName('video_with_underscores.mp4')).toMatchInlineSnapshot(`"video with underscores.mp4"`)
  })

  it('cleanFileName D should preserve and normalize apostrophes', () => {
    expect(cleanFileName("video's name.mp4")).toMatchInlineSnapshot(`"video’s name.mp4"`)
  })

  it('cleanFileName E should remove emojis and normalize spaces', () => {
    expect(cleanFileName('video 😀 emoji.mp4')).toMatchInlineSnapshot(`"video emoji.mp4"`)
    expect(cleanFileName('  video   with   spaces  .mp4')).toMatchInlineSnapshot(`"video with spaces.mp4"`)
  })

  it('shouldDelete A should return true for French subtitle files', () => {
    expect(shouldDelete('video.French.srt')).toMatchInlineSnapshot(`true`)
    expect(shouldDelete('movie(French_ASR).srt')).toMatchInlineSnapshot(`true`)
    expect(shouldDelete('show(French).srt')).toMatchInlineSnapshot(`true`)
  })

  it('shouldDelete B should return false for non-French files', () => {
    expect(shouldDelete('video.English.srt')).toMatchInlineSnapshot(`false`)
    expect(shouldDelete('video.mp4')).toMatchInlineSnapshot(`false`)
  })

  it('fileExists A should return true when file exists', () => {
    const mockStats = { isFile: () => true }
    vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats)
    expect(fileExists('/path/to/file.mp4')).toMatchInlineSnapshot(`true`)
    expect(fs.statSync).toHaveBeenCalledWith('/path/to/file.mp4')
  })

  it('fileExists B should return false when file does not exist', () => {
    vi.mocked(fs.statSync).mockImplementation(() => {
      throw new Error('File not found')
    })
    expect(fileExists('/path/to/nonexistent.mp4')).toMatchInlineSnapshot(`false`)
  })

  it('fileExists C should return false when path is not a file', () => {
    const mockStats = { isFile: () => false }
    vi.mocked(fs.statSync).mockReturnValue(mockStats as fs.Stats)
    expect(fileExists('/path/to/directory')).toMatchInlineSnapshot(`false`)
  })

  it('deleteFile A should delete file when not in dry mode', () => {
    expect(options.dry).toMatchInlineSnapshot(`false`) // Verify dry mode is off
    deleteFile('/path/to/file.mp4', 'test reason')
    expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/file.mp4')
    expect(count.deleted).toMatchInlineSnapshot(`1`)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Deleted'))).toMatchInlineSnapshot(`true`)
  })

  it('deleteFile B should not delete file when in dry mode', () => {
    options.dry = true // Enable dry mode
    deleteFile('/path/to/file.mp4', 'test reason')
    expect(fs.unlinkSync).not.toHaveBeenCalled()
    expect(count.deleted).toMatchInlineSnapshot(`1`)
    expect(logger.inMemoryLogs.some(log => log.includes('Should delete'))).toMatchInlineSnapshot(`true`)
  })

  it('renameFile A should rename file when not in dry mode', () => {
    expect(options.dry).toMatchInlineSnapshot(`false`) // Verify dry mode is off
    renameFile('/old/path.mp4', '/new/path.mp4')
    expect(fs.renameSync).toHaveBeenCalledWith('/old/path.mp4', '/new/path.mp4')
    expect(count.renamed).toMatchInlineSnapshot(`1`)
    const logs = logger.inMemoryLogs
    expect(logs[0]).toMatchInlineSnapshot(`" info Renamed file : path.mp4 to path.mp4"`)
  })

  it('renameFile B should not rename file when in dry mode', () => {
    options.dry = true // Enable dry mode
    renameFile('/old/path.mp4', '/new/path.mp4')
    expect(fs.renameSync).not.toHaveBeenCalled()
    expect(count.renamed).toMatchInlineSnapshot(`1`)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.includes('Should rename'))).toMatchInlineSnapshot(`true`)
  })

  it('checkFile A should delete files that should be deleted', () => {
    const mockUnlinkSync = vi.mocked(fs.unlinkSync)
    checkFile('video.French.srt')
    expect(mockUnlinkSync).toHaveBeenCalled()
    expect(count.deleted).toMatchInlineSnapshot(`1`)
  })

  it('checkFile B should skip files that need no changes', () => {
    checkFile('clean-file.mp4')
    expect(count.skipped).toMatchInlineSnapshot(`1`)
    expect(fs.renameSync).not.toHaveBeenCalled()
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })

  it('checkFile C should rename files that need cleaning', () => {
    const mockRenameSync = vi.mocked(fs.renameSync)
    const mockStatSync = vi.mocked(fs.statSync)
    mockStatSync.mockImplementation(() => {
      throw new Error('File not found')
    })
    checkFile('video (2160p_25fps_AV1-128kbit_AAC-French).mp4')
    expect(mockRenameSync).toHaveBeenCalled()
    expect(count.renamed).toMatchInlineSnapshot(`1`)
  })

  it('checkFile D should delete duplicate files', () => {
    const mockUnlinkSync = vi.mocked(fs.unlinkSync)
    const mockStatSync = vi.mocked(fs.statSync)
    mockStatSync.mockReturnValue({ isFile: () => true } as fs.Stats)
    checkFile('video (2160p_25fps_AV1-128kbit_AAC-French).mp4')
    expect(mockUnlinkSync).toHaveBeenCalled()
    expect(count.deleted).toMatchInlineSnapshot(`1`)
  })

  it('checkFiles A should process all files in the array', () => {
    const mockUnlinkSync = vi.mocked(fs.unlinkSync)
    checkFiles(['video.French.srt', 'another.French.srt', 'normal.mp4'])
    expect(mockUnlinkSync).toHaveBeenCalledTimes(2)
    expect(count.deleted).toMatchInlineSnapshot(`2`)
    expect(count.skipped).toMatchInlineSnapshot(`1`)
  })

  it('checkFiles B should handle empty array', () => {
    checkFiles([])
    expect(count.deleted).toMatchInlineSnapshot(`0`)
    expect(count.renamed).toMatchInlineSnapshot(`0`)
    expect(count.skipped).toMatchInlineSnapshot(`0`)
  })

  it('getFiles A should return list of files from current directory', () => {
    const mockFiles = ['file1.mp4', 'file2.srt', 'file3.txt']
    vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as never)
    const result = getFiles()
    expect(fs.readdirSync).toHaveBeenCalledWith(currentFolder)
    expect(result).toMatchInlineSnapshot(`
        [
          "file1.mp4",
          "file2.srt",
          "file3.txt",
        ]
      `)
    const logs = logger.inMemoryLogs
    expect(logs.some(log => log.trim().includes('info Found 3 files'))).toBe(true)
  })

  it('getFiles B should log scanning message', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['file.mp4'] as never)
    getFiles()
    const logs = logger.inMemoryLogs
    expect(logs[1]).toMatchInlineSnapshot(`" info Found 1 files"`)
  })

  it('showReport A should show count of all operations', () => {
    count.deleted = 5
    count.renamed = 3
    count.skipped = 2
    showReport()
    const logs = logger.inMemoryLogs
    expect(logs.join(',').trim()).toMatchInlineSnapshot(`"info 5 files deleted, info 3 files renamed, info 2 files skipped (no changes needed)"`)
  })

  it('showReport B should show count with dry mode messaging', () => {
    options.dry = true // Enable dry mode
    count.deleted = 5
    count.renamed = 3
    count.skipped = 2
    showReport()
    const logs = logger.inMemoryLogs
    expect(logs.join(',').trim()).toMatchInlineSnapshot(`"info 5 files should be deleted, info 3 files should be renamed, info 2 files skipped (no changes needed)"`)
  })

  it('resetCount A should reset all count values to zero', () => {
    count.deleted = 10
    count.renamed = 5
    count.skipped = 3
    resetCount()
    expect(count.deleted).toMatchInlineSnapshot(`0`)
    expect(count.renamed).toMatchInlineSnapshot(`0`)
    expect(count.skipped).toMatchInlineSnapshot(`0`)
  })

  it('start A should execute complete workflow without warnings', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['test.mp4'] as never)
    start()
    const logs = logger.inMemoryLogs
    expect(logs.slice(2)).toMatchInlineSnapshot(`
        [
          " info Found 1 files",
          " info Found 1 files to check",
          " info 0 files deleted",
          " info 0 files renamed",
          " info 1 files skipped (no changes needed)",
          " good No warning found ( ͡° ͜ʖ ͡°)",
          " good Clean is done",
        ]
      `)
  })

  it('start B should detect warnings in logs', () => {
    vi.mocked(fs.readdirSync).mockReturnValue(['test.mp4'] as never)
    logger.warn('Test warning')
    start()
    const logs = logger.inMemoryLogs
    expect(logs.pop()?.trim()).toMatchInlineSnapshot(`"good Clean is done"`)
  })

  it('count A should export count object with correct structure', () => {
    expect(count).toBeDefined()
    expect(count).toHaveProperty('deleted')
    expect(count).toHaveProperty('renamed')
    expect(count).toHaveProperty('skipped')
  })

  it('currentFolder A should export currentFolder and options as expected types', () => {
    expect(currentFolder).toBeDefined()
    expect(typeof currentFolder).toMatchInlineSnapshot(`"string"`)
    expect(options).toBeDefined()
    expect(typeof options.dry).toMatchInlineSnapshot(`"boolean"`)
  })
})
