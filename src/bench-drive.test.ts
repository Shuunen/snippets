import { invariant } from 'es-toolkit'
import {
  alignmentOffset,
  type BenchConfig,
  type BenchContext,
  type BenchReport,
  computeResult,
  createSustainedState,
  decodeUdevValue,
  describeDataCheck,
  describeSustained,
  defaultConfig,
  type Drive,
  type DriveIdentity,
  fileSystemName,
  formatBytes,
  formatLatency,
  formatReportDetails,
  formatResults,
  formatSpeed,
  hasEnoughSpace,
  isSameContent,
  isSelectableDrive,
  isYes,
  linuxName,
  marketedSizeGb,
  megabyte,
  moveSelection,
  parseDriveChoice,
  parseMounts,
  parseUdevProperties,
  parseUsbVersion,
  pcieGeneration,
  pickTestFolder,
  runRandomRead,
  runRandomWrite,
  runSequentialRead,
  runSequentialWrite,
  runSmallFiles,
  shuffledPositions,
  smallFileSizes,
  type SmallFilesOps,
  splitBrandModel,
  spreadsheetRow,
  stampBlock,
  testNames,
  toSpeed,
  updateSustained,
  usbLinkWarning,
  usbMaxSpeedFromBos,
  windowsName,
} from './bench-drive.cli'

const mounts = `sysfs /sys sysfs rw,nosuid 0 0
/dev/mapper/vg-root / ext4 rw,relatime 0 0
tmpfs /run tmpfs rw 0 0
/dev/loop3 /snap/core/1 squashfs ro 0 0
/dev/sr0 /media/cdrom iso9660 ro 0 0
/dev/sda1 /media/user/My\\040Key exfat rw 0 0
/dev/sda1 /mnt/bind exfat rw 0 0
`

const smallConfig: BenchConfig = {
  ...defaultConfig,
  bigBlockSize: 16,
  fileSize: 1600,
  maxRandomBlocks: 50,
  randomPoolSize: 16,
  randomTestDurationMs: 1000,
  smallBlockSize: 8,
  smallFileMaxSize: 32,
  smallFilesCount: 10,
  sustainedWindowMs: 10,
}

type Operation = { firstByte: number | undefined; kind: 'read' | 'write'; length: number; position: number }

type ContextOptions = {
  /** number of progress updates before aborting */
  abortAfter?: number
  config?: BenchConfig
  /** extra time spent by the nth write, to simulate a drive slowing down */
  writeDelay?: (nbWrites: number) => number
}

/**
 * Create a benchmark context with in-memory files and a fake clock advancing 1ms per call
 * @param options the context options
 * @returns the context, the recorded operations, the progress and the file memory
 */
function createContext(options: ContextOptions = {}) {
  const { abortAfter = Number.POSITIVE_INFINITY, config = smallConfig, writeDelay = () => 0 } = options
  const operations: Operation[] = []
  const progress: number[] = []
  const memory = new Uint8Array(config.fileSize)
  let time = 0
  let nbWrites = 0
  const context: BenchContext = {
    config,
    file: {
      read: (buffer, length, position) => {
        operations.push({ firstByte: buffer[0], kind: 'read', length, position })
        buffer.set(memory.subarray(position, position + length))
      },
      write: (buffer, length, position) => {
        operations.push({ firstByte: buffer[0], kind: 'write', length, position })
        memory.set(buffer.subarray(0, length), position)
        nbWrites += 1
        time += writeDelay(nbWrites)
      },
    },
    isAborted: () => progress.length >= abortAfter,
    now: () => {
      time += 1
      return time
    },
    onProgress: (_name, percent) => progress.push(percent),
    random: () => 0.5,
    runId: 42,
  }
  return { context, memory, operations, progress }
}

/**
 * Create in-memory small files operations
 * @returns the operations and the stored files
 */
function createSmallFilesOps() {
  const files = new Map<number, Uint8Array>()
  let nbSyncs = 0
  const ops: SmallFilesOps = {
    read: (index, buffer, length) => {
      buffer.set((files.get(index) ?? new Uint8Array(length)).subarray(0, length))
    },
    syncAll: () => {
      nbSyncs += 1
    },
    write: (index, data) => {
      files.set(index, data.slice())
    },
  }
  return { files, nbSyncs: () => nbSyncs, ops }
}

const report: BenchReport = {
  dataChecked: 266,
  dataErrors: 0,
  results: [testNames.sequentialWrite, testNames.sequentialRead, testNames.randomWrite, testNames.randomRead].map((name, index) => ({
    average: [21.7, 224.336, 0.07, 4.68][index] ?? 0,
    deviation: 0,
    latency: [184.33, 17.83, 55.8, 0.835][index] ?? 0,
    name,
    nbOperations: 1,
  })),
  smallFiles: { readRate: 412.4, writeRate: 85.6 },
  sustained: { cacheBytes: 210_000_000, speed: 3.123, testedBytes: 1_073_741_824 },
}

const drive: Drive = { device: '/dev/sda1', freeBytes: 10 * 1024 * megabyte, fsType: 'exfat', mountPoint: '/media/key', testFolder: '/media/key', totalBytes: 16 * 1024 * megabyte }

describe('bench-drive', () => {
  it('parseMounts keeps one entry per physical device', () => {
    expect(parseMounts(mounts)).toMatchInlineSnapshot(`
      [
        {
          "device": "/dev/mapper/vg-root",
          "fsType": "ext4",
          "mountPoint": "/",
        },
        {
          "device": "/dev/sda1",
          "fsType": "exfat",
          "mountPoint": "/media/user/My Key",
        },
      ]
    `)
  })

  it('pickTestFolder prefers the mount point', () => {
    expect(pickTestFolder('/media/key', ['/home/me'], () => true)).toBe('/media/key')
  })

  it('pickTestFolder falls back to a candidate on the same drive', () => {
    expect(pickTestFolder('/', ['/home/me', '/tmp'], folder => folder === '/tmp')).toBe('/tmp')
  })

  it('pickTestFolder returns undefined when nothing is usable', () => {
    expect(pickTestFolder('/boot', ['/home/me'], () => false)).toBeUndefined()
  })

  it('hasEnoughSpace needs the file size plus the safety margin', () => {
    expect(hasEnoughSpace(2 * 1024 * megabyte)).toBe(true)
    expect(hasEnoughSpace(2 * 1024 * megabyte - 1)).toBe(false)
    expect(hasEnoughSpace(500, smallConfig)).toBe(false)
  })

  it('formatBytes formats sizes for humans', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(57.7 * 1024 * megabyte)).toBe('57.7 GB')
    expect(formatBytes(2048 * 1024 ** 5)).toBe('2048.0 PB')
  })

  it('formatSpeed formats speeds with two decimals', () => {
    expect(formatSpeed(12.345)).toBe('12.35 MB/s')
  })

  it('parseDriveChoice returns the selected drive', () => {
    expect(parseDriveChoice(' 1 ', [drive])).toStrictEqual({ drive })
  })

  it('parseDriveChoice rejects out of range choices', () => {
    expect(parseDriveChoice('2', [drive])).toStrictEqual({ error: 'Invalid choice "2", type a number between 1 and 1' })
    expect(parseDriveChoice('abc', [drive])).toStrictEqual({ error: 'Invalid choice "abc", type a number between 1 and 1' })
  })

  it('parseDriveChoice rejects drives without writable folder', () => {
    expect(parseDriveChoice('1', [{ ...drive, testFolder: undefined }])).toStrictEqual({ error: 'No writable folder found on /media/key' })
  })

  it('parseDriveChoice rejects drives without enough free space', () => {
    expect(parseDriveChoice('1', [{ ...drive, freeBytes: megabyte }])).toStrictEqual({ error: 'Not enough free space on /media/key, 2.0 GB are needed' })
  })

  it('alignmentOffset returns the bytes to skip to reach an aligned address', () => {
    expect(alignmentOffset(8192)).toBe(0)
    expect(alignmentOffset(4097)).toBe(4095)
    expect(alignmentOffset(10, 8)).toBe(6)
  })

  it('shuffledPositions returns each block position once', () => {
    const positions = shuffledPositions(100, 4, Math.random)
    expect(positions).toHaveLength(100)
    expect(positions.toSorted((first, second) => first - second)).toStrictEqual(Array.from({ length: 100 }, (_value, index) => index * 4))
  })

  it('shuffledPositions is driven by the random generator', () => {
    expect(shuffledPositions(4, 4, () => 0)).toStrictEqual([4, 8, 12, 0])
  })

  it('toSpeed converts bytes and milliseconds to MB/s', () => {
    expect(toSpeed(megabyte, 1000)).toBe(1)
    expect(toSpeed(megabyte, 0)).toBe(1_000_000)
  })

  it('computeResult aggregates measures with their standard deviation and latency', () => {
    const result = computeResult('test', [
      { bytes: megabyte, ms: 100 },
      { bytes: megabyte, ms: 300 },
      { bytes: megabyte, ms: 200 },
    ])
    expect(result).toStrictEqual({ average: 5, deviation: 2.5, latency: 200, name: 'test', nbOperations: 3 })
  })

  it('computeResult has no deviation for steady measures', () => {
    expect(
      computeResult('test', [
        { bytes: megabyte, ms: 0 },
        { bytes: megabyte, ms: 0 },
      ]).deviation,
    ).toBe(0)
    expect(computeResult('test', [{ bytes: megabyte, ms: 500 }])).toStrictEqual({ average: 2, deviation: 0, latency: 500, name: 'test', nbOperations: 1 })
  })

  it('computeResult handles no measures', () => {
    expect(computeResult('test', [])).toStrictEqual({ average: 0, deviation: 0, latency: 0, name: 'test', nbOperations: 0 })
  })

  it('stampBlock writes the run id and the block index at the start of a block', () => {
    const block = new Uint8Array(12).fill(7)
    stampBlock(block, 1, 258)
    expect([...block]).toStrictEqual([0, 0, 0, 1, 0, 0, 1, 2, 7, 7, 7, 7])
  })

  it('isSameContent compares the first bytes of two buffers', () => {
    const block = Uint8Array.from([1, 2, 3, 4])
    expect(isSameContent(Uint8Array.from([1, 2, 3, 9]), block, 3)).toBe(true)
    expect(isSameContent(Uint8Array.from([1, 2, 3, 9]), block, 4)).toBe(false)
  })

  it('updateSustained tracks the peak speed while the drive is fast', () => {
    const state = updateSustained(createSustainedState(100), { bytes: megabyte, ms: 10 }, smallConfig)
    expect(state).toStrictEqual({ ...createSustainedState(100 + megabyte), peakSpeed: 100 })
  })

  it('updateSustained detects the end of the cache and the sustained speed', () => {
    const fast = updateSustained(createSustainedState(), { bytes: megabyte, ms: 10 }, smallConfig)
    const dropped = updateSustained(fast, { bytes: megabyte, ms: 100 }, smallConfig)
    expect(dropped.cacheBytes).toBe(megabyte)
    const steady = updateSustained(dropped, { bytes: megabyte, ms: 100 }, smallConfig)
    expect(steady.cacheBytes).toBe(megabyte)
    expect(toSpeed(steady.slowBytes, steady.slowMs)).toBe(10)
  })

  it('updateSustained ignores a short slowdown', () => {
    const fast = updateSustained(createSustainedState(), { bytes: megabyte, ms: 10 }, smallConfig)
    const dropped = updateSustained(fast, { bytes: megabyte, ms: 100 }, smallConfig)
    const recovered = updateSustained(dropped, { bytes: megabyte, ms: 10 }, smallConfig)
    expect(recovered).toStrictEqual({ ...createSustainedState(3 * megabyte), peakSpeed: 100 })
  })

  it('runSequentialWrite warms up, writes stamped blocks then finds the end of the write cache', async () => {
    const { context, memory, operations, progress } = createContext({ writeDelay: nbWrites => (nbWrites > 65 ? 9 : 0) })
    const { result, sustained } = await runSequentialWrite(context, new Uint8Array(16))
    expect(operations).toHaveLength(105)
    expect(operations.every(operation => operation.kind === 'write' && operation.length === 16)).toBe(true)
    expect(operations.at(4)?.position).toBe(64)
    expect(operations.at(5)?.position).toBe(0)
    expect(operations.at(-1)?.position).toBe(1584)
    expect([...memory.subarray(1584, 1592)]).toStrictEqual([0, 0, 0, 42, 0, 0, 0, 99])
    expect(progress.at(-1)).toBe(100)
    expect(result.name).toBe(testNames.sequentialWrite)
    expect(result.nbOperations).toBe(100)
    expect(sustained.cacheBytes).toBeGreaterThan(60 * 16)
    expect(sustained.cacheBytes).toBeLessThanOrEqual(65 * 16)
    expect(sustained.speed).toBeCloseTo(toSpeed(16, 10))
    expect(sustained.testedBytes).toBe(105 * 16)
  })

  it('runSequentialWrite reports no slowdown when the drive stays fast', async () => {
    const { context } = createContext()
    const { result, sustained } = await runSequentialWrite(context, new Uint8Array(16))
    expect(sustained).toStrictEqual({ cacheBytes: undefined, speed: result.average, testedBytes: 105 * 16 })
  })

  it('runSequentialWrite stops when aborted', async () => {
    const { context } = createContext({ abortAfter: 3 })
    await expect(runSequentialWrite(context, new Uint8Array(16))).rejects.toThrow('Benchmark aborted by user')
  })

  it('runSequentialRead reads the whole file and verifies each block', async () => {
    const { context, operations } = createContext()
    const written = new Uint8Array(16).fill(5)
    await runSequentialWrite(context, written)
    const { dataErrors, nbBlocks, result } = await runSequentialRead(context, written, new Uint8Array(16))
    expect(operations.filter(operation => operation.kind === 'read')).toHaveLength(100)
    expect(dataErrors).toBe(0)
    expect(nbBlocks).toBe(100)
    expect(result.name).toBe(testNames.sequentialRead)
  })

  it('runSequentialRead counts the blocks read back with a wrong content', async () => {
    const { context, memory } = createContext()
    const written = new Uint8Array(16).fill(5)
    await runSequentialWrite(context, written)
    memory[30] = 0
    memory.set(memory.subarray(0, 16), 32)
    const { dataErrors } = await runSequentialRead(context, written, new Uint8Array(16))
    expect(dataErrors).toBe(2)
  })

  it('runRandomWrite writes changed blocks until every block is touched', async () => {
    const { context, operations } = createContext({ config: { ...smallConfig, randomTestDurationMs: 100_000 } })
    const result = await runRandomWrite(context, new Uint8Array(16))
    expect(operations).toHaveLength(50)
    expect(operations.every(operation => operation.kind === 'write' && operation.length === 8 && operation.firstByte === 128)).toBe(true)
    expect(new Set(operations.map(operation => operation.position)).size).toBe(50)
    expect(result.name).toBe(testNames.randomWrite)
  })

  it('runRandomRead stops when the time is up', async () => {
    const { context, operations, progress } = createContext({ config: { ...smallConfig, randomTestDurationMs: 20 } })
    const result = await runRandomRead(context, new Uint8Array(16))
    expect(operations).toHaveLength(7)
    expect(operations.every(operation => operation.kind === 'read')).toBe(true)
    expect(progress.at(-1)).toBe(100)
    expect(result.name).toBe(testNames.randomRead)
  })

  it('smallFileSizes picks multiples of the small block size up to the max size', () => {
    expect(smallFileSizes(smallConfig, () => 0)).toStrictEqual(Array.from({ length: 10 }, () => 8))
    expect(smallFileSizes(smallConfig, () => 0.99)).toStrictEqual(Array.from({ length: 10 }, () => 32))
  })

  it('runSmallFiles writes, syncs, reads back and verifies the files', async () => {
    const { context } = createContext()
    const { files, nbSyncs, ops } = createSmallFilesOps()
    const result = await runSmallFiles(context, ops, { buffer: new Uint8Array(32), data: new Uint8Array(32).fill(3) })
    expect(files.size).toBe(10)
    expect(files.get(9)?.length).toBe(24)
    expect(nbSyncs()).toBe(1)
    expect(result.dataErrors).toBe(0)
    expect(result.nbFiles).toBe(10)
    expect(result.smallFiles.writeRate).toBeGreaterThan(0)
    expect(result.smallFiles.readRate).toBeGreaterThan(0)
  })

  it('runSmallFiles counts the files read back with a wrong content', async () => {
    const { context } = createContext()
    const { files, ops } = createSmallFilesOps()
    const originalSync = ops.syncAll
    ops.syncAll = () => {
      originalSync()
      files.set(2, new Uint8Array(32))
    }
    const result = await runSmallFiles(context, ops, { buffer: new Uint8Array(32), data: new Uint8Array(32).fill(3) })
    expect(result.dataErrors).toBe(1)
  })

  it('formatResults renders an aligned table with latency', () => {
    const results = [computeResult(testNames.sequentialWrite, [{ bytes: megabyte, ms: 10 }]), computeResult('Short', [{ bytes: megabyte, ms: 1000 }])]
    const lines = formatResults(results)
    const [header] = lines
    invariant(header, 'header should be defined')
    expect(lines).toHaveLength(3)
    expect(lines.every(line => line.length === header.length)).toBe(true)
    expect(header).toContain('± σ')
    expect(header).toContain('Latency')
    expect(lines[1]).toContain('100.00 MB/s')
    expect(lines[1]).toContain('± 0.00 MB/s')
    expect(lines[1]).toContain('10.00 ms')
  })

  it('formatLatency formats durations with two decimals', () => {
    expect(formatLatency(0.8349)).toBe('0.83 ms')
  })

  it('describeDataCheck tells if the data read back is correct', () => {
    expect(describeDataCheck(report)).toBe('OK, 266 blocks and files verified')
    expect(describeDataCheck({ ...report, dataErrors: 3 })).toBe('3 of 266 blocks and files read back with a WRONG content, do not trust this drive')
  })

  it('describeSustained describes the write cache', () => {
    expect(describeSustained(report.sustained)).toBe('200.3 MB at full speed, then 3.12 MB/s')
    expect(describeSustained({ cacheBytes: undefined, speed: 512, testedBytes: 1_073_741_824 })).toBe('no slowdown within 1.0 GB, 512.00 MB/s')
  })

  it('formatReportDetails renders the extra results', () => {
    expect(formatReportDetails(report)).toStrictEqual(['Data check            OK, 266 blocks and files verified', 'Sustained write [4MB] 200.3 MB at full speed, then 3.12 MB/s', 'Small files [4-64KB]  write 86 files/s, read 412 files/s'])
  })

  it('marketedSizeGb returns the size printed on the box', () => {
    expect(marketedSizeGb(62_008_590_336)).toBe(64)
    expect(marketedSizeGb(123_000_000_000)).toBe(128)
    expect(marketedSizeGb(120_034_123_776)).toBe(120)
    expect(marketedSizeGb(250_059_350_016)).toBe(250)
    expect(marketedSizeGb(1_000_204_886_016)).toBe(1000)
    expect(marketedSizeGb(4_000_787_030_016)).toBe(4000)
    expect(marketedSizeGb(20_000_000_000_000)).toBe(20_000)
  })

  it('pcieGeneration converts a link speed to a PCIe generation', () => {
    expect(pcieGeneration('16.0 GT/s PCIe')).toBe(4)
    expect(pcieGeneration('2.5 GT/s PCIe')).toBe(1)
    expect(pcieGeneration('Unknown')).toBeUndefined()
    expect(pcieGeneration('')).toBeUndefined()
  })

  it('parseUsbVersion parses the version announced by a USB device', () => {
    expect(parseUsbVersion(' 3.20')).toBe(3.2)
    expect(parseUsbVersion('2.00')).toBe(2)
    expect(parseUsbVersion('')).toBeUndefined()
    expect(parseUsbVersion('abc')).toBeUndefined()
  })

  it('parseUdevProperties parses udevadm output', () => {
    const properties = parseUdevProperties('ID_BUS=usb\nID_SERIAL_SHORT=1C1B0D6A8ADFE8B1491A001C\nID_MODEL_ENC=DataTraveler\\x203.0\ninvalid line\n')
    expect(properties.get('ID_BUS')).toBe('usb')
    expect(properties.get('ID_SERIAL_SHORT')).toBe('1C1B0D6A8ADFE8B1491A001C')
    expect(properties.size).toBe(3)
  })

  it('decodeUdevValue decodes hex escapes', () => {
    expect(decodeUdevValue(String.raw`DataTraveler\x203.0\x20\x20`)).toBe('DataTraveler 3.0')
  })

  it('splitBrandModel uses the vendor as brand', () => {
    expect(splitBrandModel('Kingston', 'DataTraveler 3.0')).toStrictEqual({ brand: 'Kingston', model: 'DataTraveler 3.0' })
    expect(splitBrandModel('Kingston', 'Kingston DataTraveler 3.0 USB Device')).toStrictEqual({ brand: 'Kingston', model: 'DataTraveler 3.0' })
  })

  it('splitBrandModel uses the first model word as brand when the vendor is missing or generic', () => {
    expect(splitBrandModel('', 'WD_BLACK SN850X HS 4000GB')).toStrictEqual({ brand: 'WD_BLACK', model: 'SN850X HS 4000GB' })
    expect(splitBrandModel('ATA', 'Samsung SSD 870 EVO')).toStrictEqual({ brand: 'Samsung', model: 'SSD 870 EVO' })
    expect(splitBrandModel('USB', 'SanDisk 3.2Gen1')).toStrictEqual({ brand: 'SanDisk', model: '3.2Gen1' })
    expect(splitBrandModel('', '')).toStrictEqual({ brand: '', model: '' })
  })

  it('fileSystemName names filesystems like in the spreadsheet', () => {
    expect(fileSystemName('exfat')).toBe('exFat')
    expect(fileSystemName('exFAT')).toBe('exFat')
    expect(fileSystemName('ntfs3')).toBe('NTFS')
    expect(fileSystemName('fuseblk')).toBe('NTFS')
    expect(fileSystemName('vfat')).toBe('FAT32')
    expect(fileSystemName('FAT32')).toBe('FAT32')
    expect(fileSystemName('ext4')).toBe('ext4')
  })

  it('windowsName detects Windows 11 from the build number', () => {
    expect(windowsName('10.0.22631')).toBe('Windows 11')
    expect(windowsName('10.0.19045')).toBe('Windows 10')
  })

  it('linuxName uses the distribution name and version', () => {
    expect(linuxName('PRETTY_NAME="Linux Mint 22"\nNAME="Linux Mint"\nVERSION_ID="22"\n')).toBe('Linux Mint 22')
    expect(linuxName('NAME=Arch\n')).toBe('Arch')
    expect(linuxName('')).toBe('Linux')
  })

  it('spreadsheetRow builds a tab separated row from column C to V', () => {
    const identity: DriveIdentity = { brand: 'Kingston', fileSystem: 'exfat', linkSpeed: 5000, model: 'DataTraveler 3.0', serial: '1C1B0D6A8ADFE8B1491A001C', sizeBytes: 62_008_590_336, type: 'Key', version: 3.2 }
    const cells = spreadsheetRow(identity, 'Linux Mint 22', report).split('\t')
    expect(cells).toStrictEqual(['Key', 'Kingston', 'DataTraveler 3.0', '3,2', '1C1B0D6A8ADFE8B1491A001C', '64', 'Linux Mint 22', 'exFat', '21,70', '224,34', '0,07', '4,68', '5000', 'OK', '55,80', '0,83', '0,21', '3,12', '86', '412'])
  })

  it('spreadsheetRow leaves unknown cells empty', () => {
    const identity: DriveIdentity = { brand: 'WD_BLACK', fileSystem: 'ext4', linkSpeed: undefined, model: 'SN850X', serial: '', sizeBytes: 4_000_787_030_016, type: 'Drive', version: undefined }
    const cells = spreadsheetRow(identity, 'Windows 11', { ...report, dataErrors: 2, results: [], sustained: { cacheBytes: undefined, speed: 1500, testedBytes: 1_073_741_824 } }).split('\t')
    expect(cells).toHaveLength(20)
    expect(cells.at(3)).toBe('')
    expect(cells.at(11)).toBe('')
    expect(cells.at(12)).toBe('')
    expect(cells.at(13)).toBe('2 errors')
    expect(cells.at(14)).toBe('')
    expect(cells.at(16)).toBe('1,07')
    expect(cells.at(17)).toBe('1500,00')
  })

  it('isYes treats an empty answer as yes', () => {
    expect(isYes('')).toBe(true)
    expect(isYes(' Y ')).toBe(true)
    expect(isYes('oui')).toBe(true)
    expect(isYes('n')).toBe(false)
    expect(isYes('nope')).toBe(false)
  })

  it('isYes uses the default for an empty answer', () => {
    expect(isYes('', false)).toBe(false)
    expect(isYes('y', false)).toBe(true)
  })

  it('usbMaxSpeedFromBos reads the SuperSpeed capability of a USB 3 key on a USB 2 link', () => {
    // real BOS descriptor of a SanDisk 3.2Gen1 key : USB 2.0 extension + SuperSpeed capabilities
    const sandisk = Uint8Array.from([0x05, 0x0f, 0x16, 0x00, 0x02, 0x07, 0x10, 0x02, 0x02, 0x00, 0x00, 0x00, 0x0a, 0x10, 0x03, 0x00, 0x0e, 0x00, 0x01, 0x0a, 0x00, 0x01])
    expect(usbMaxSpeedFromBos(sandisk)).toBe(5000)
  })

  it('usbMaxSpeedFromBos detects SuperSpeedPlus devices', () => {
    expect(usbMaxSpeedFromBos(Uint8Array.from([0x05, 0x0f, 0x0f, 0x00, 0x02, 0x0a, 0x10, 0x03, 0, 0, 0, 0, 0, 0, 0, 0x04, 0x10, 0x0a, 0]))).toBe(10_000)
  })

  it('usbMaxSpeedFromBos returns undefined for USB 2 only devices or broken descriptors', () => {
    expect(usbMaxSpeedFromBos(Uint8Array.from([0x05, 0x0f, 0x0c, 0x00, 0x01, 0x07, 0x10, 0x02, 0x02, 0x00, 0x00, 0x00]))).toBeUndefined()
    expect(usbMaxSpeedFromBos(Uint8Array.from([0x05, 0x0f, 0x0c, 0x00, 0x01, 0x00, 0x10]))).toBeUndefined()
    expect(usbMaxSpeedFromBos(Uint8Array.from([0x05, 0x0f, 0x07, 0x00, 0x01, 0x02, 0x10]))).toBeUndefined()
    expect(usbMaxSpeedFromBos(new Uint8Array(0))).toBeUndefined()
  })

  it('usbLinkWarning warns when the link is slower than the device', () => {
    expect(usbLinkWarning(480, 5000)).toBe(
      'This drive supports USB 3.2 Gen 1 (5 Gb/s) but runs in USB 2.0 (480 Mb/s) mode, so speeds will be capped around 40 MB/s. Usual causes: a USB 2.0 port, a hub or extension cable, or the drive inserted too slowly.',
    )
    expect(usbLinkWarning(5000, 10_000)).toContain('runs in USB 3.2 Gen 1 (5 Gb/s) mode, so speeds will be capped around 450 MB/s. Usual causes: a USB 3.2 Gen 1 port')
    expect(usbLinkWarning(1500, 40_000)).toBe('This drive supports 40 Gb/s but runs in 1.5 Gb/s mode, so speeds will be capped by the connection. Usual causes: a slower port, a hub or extension cable, or the drive inserted too slowly.')
    expect(usbLinkWarning(5000, 5000)).toBeUndefined()
    expect(usbLinkWarning(480, undefined)).toBeUndefined()
  })

  it('isSelectableDrive needs a writable folder and enough free space', () => {
    expect(isSelectableDrive(drive)).toBe(true)
    expect(isSelectableDrive({ ...drive, testFolder: undefined })).toBe(false)
    expect(isSelectableDrive({ ...drive, freeBytes: megabyte })).toBe(false)
  })

  it('moveSelection skips drives that cannot be selected and wraps around', () => {
    const drives = [drive, { ...drive, testFolder: undefined }, { ...drive, freeBytes: megabyte }, drive]
    expect(moveSelection(drives, -1, 1)).toBe(0)
    expect(moveSelection(drives, 0, 1)).toBe(3)
    expect(moveSelection(drives, 3, 1)).toBe(0)
    expect(moveSelection(drives, 0, -1)).toBe(3)
    expect(moveSelection(drives, 3, -1)).toBe(0)
  })

  it('moveSelection keeps the current index when nothing else is selectable', () => {
    expect(moveSelection([drive], 0, 1)).toBe(0)
    expect(moveSelection([{ ...drive, testFolder: undefined }], -1, 1)).toBe(-1)
    expect(moveSelection([], -1, 1)).toBe(-1)
  })
})
