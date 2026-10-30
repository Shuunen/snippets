// oxlint-disable max-lines
import { execFileSync } from 'node:child_process'
import { randomFillSync, randomInt } from 'node:crypto'
import { on } from 'node:events'
import { accessSync, closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, realpathSync, rmSync, statfsSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs'
import { homedir, release, tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { createInterface, emitKeypressEvents } from 'node:readline'
import clipboard from 'clipboardy'
import { invariant } from 'es-toolkit'
import { blue, bold, cyan, dim, green, Logger, nbMsInSecond, nbPercentMax, red, sleep } from 'shuutils'

// Benchmark a drive like maxim-saplin/CrossPlatformDiskTest does, without touching existing data :
// a temporary 1 GB file is written, read back then deleted, reads and writes bypass the OS cache.
// use me like :
//  bun ~/Projects/github/snippets/src/bench-drive.cli.ts               # pick a drive interactively
//  bun ~/Projects/github/snippets/src/bench-drive.cli.ts /media/my-key # benchmark the drive hosting this folder

const kilobyte = 1024
export const megabyte = kilobyte * kilobyte
const gigabyte = megabyte * kilobyte

/**
 * Same parameters as maxim-saplin/NetCoreStorageSpeedTest BigTest, so results are comparable
 */
export const defaultConfig = {
  /** sequential tests block size : 4 MB */
  bigBlockSize: 4_194_304,
  /** test file size, written once then read back */
  fileSize: gigabyte,
  /** max number of random positions shuffled per random test */
  maxRandomBlocks: megabyte,
  /** pool of random data used by the random write test to avoid writing the same block over and over : 16 MB */
  randomPoolSize: 16_777_216,
  /** each random test stops after this duration or when every block has been touched */
  randomTestDurationMs: 7000,
  /** free space that must remain on the drive once the test file is written */
  safetyMargin: gigabyte,
  /** random tests block size : 4 KB */
  smallBlockSize: 4096,
  /** biggest small file : 64 KB */
  smallFileMaxSize: 65_536,
  /** number of small files written then read back */
  smallFilesCount: 200,
  /** the speed dropped when it falls below this ratio of the peak speed, the write cache is full */
  sustainedDropRatio: 0.5,
  /** the write speed is tracked over windows of this duration */
  sustainedWindowMs: 1000,
  /** ratio of the sequential write blocks written before measuring, to wake up the drive */
  warmUpRatio: 0.05,
}

export type BenchConfig = typeof defaultConfig

export const testNames = {
  randomRead: 'Random read [4KB]',
  randomWrite: 'Random write [4KB]',
  sequentialRead: 'Sequential read [4MB]',
  sequentialWrite: 'Sequential write [4MB]',
  smallFiles: 'Small files [4-64KB]',
  sustainedWrite: 'Sustained write [4MB]',
} as const

/** direct I/O needs buffers aligned on the device sector size, a page covers every common sector size */
export const memoryAlignment = 4096

export type MountEntry = {
  device: string
  fsType: string
  mountPoint: string
}

export type Drive = {
  device: string
  freeBytes: number
  fsType: string
  mountPoint: string
  /** folder where the test file will be written, undefined if no writable folder was found on this drive */
  testFolder: string | undefined
  totalBytes: number
}

/** synchronous positional I/O on the test file, implemented with direct (uncached) I/O by the cli */
export type BenchFile = {
  read: (buffer: Uint8Array, length: number, position: number) => void
  write: (buffer: Uint8Array, length: number, position: number) => void
}

export type BenchResult = {
  /** average speed in MB/s : total bytes divided by the cumulated duration of each operation */
  average: number
  /** standard deviation in MB/s, like hyperfine's "mean ± σ" : the relative deviation of the operation durations applied to the average speed */
  deviation: number
  /** average duration of one operation in milliseconds */
  latency: number
  name: string
  nbOperations: number
}

export type SustainedResult = {
  /** bytes written at full speed before the speed dropped, undefined if it never dropped during the test file write */
  cacheBytes: number | undefined
  /** speed in MB/s once the cache is full, or the average speed if it never dropped */
  speed: number
  /** bytes written while looking for a slowdown */
  testedBytes: number
}

export type SmallFilesResult = {
  readRate: number
  /** files per second, including the time to make sure they are stored on the drive */
  writeRate: number
}

export type BenchReport = {
  /** number of blocks or files read back with a content different from what was written */
  dataErrors: number
  /** number of blocks and files verified */
  dataChecked: number
  /** the 4 classic tests */
  results: BenchResult[]
  smallFiles: SmallFilesResult
  sustained: SustainedResult
}

const ignoredFsTypes = new Set(['squashfs', 'iso9660', 'udf'])
const octalBase = 8
const speedDecimals = 2
const speedColumnWidth = 14

/**
 * Decode the octal escapes used in /proc/mounts, like "\040" for a space
 * @param value the escaped value
 * @returns the decoded value
 * @example decodeMountValue('/media/my\\040key') // '/media/my key'
 */
function decodeMountValue(value: string) {
  return value.replaceAll(/\\(?<code>[0-7]{3})/gu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, octalBase)))
}

/**
 * Parse the content of /proc/self/mounts, keeping only the filesystems that live on a real block device
 * @param content the content of /proc/self/mounts
 * @returns the mounted physical drives, one entry per device
 */
export function parseMounts(content: string) {
  const entries: MountEntry[] = []
  const devices = new Set<string>()
  for (const line of content.split('\n')) {
    const [device = '', mountPoint = '', fsType = ''] = line.split(' ')
    if (!device.startsWith('/dev/') || device.startsWith('/dev/loop')) continue
    if (ignoredFsTypes.has(fsType) || devices.has(device)) continue
    devices.add(device)
    entries.push({ device, fsType, mountPoint: decodeMountValue(mountPoint) })
  }
  return entries
}

/**
 * Find a writable folder on the drive to host the test file : the mount point itself or a known folder living on the same device
 * @param mountPoint the drive mount point
 * @param candidates folders to try when the mount point is not writable, like the home or temp folder
 * @param isUsable tells if a folder is writable and lives on the same device as the mount point
 * @returns the folder to use, or undefined if none is usable
 */
export function pickTestFolder(mountPoint: string, candidates: readonly string[], isUsable: (folder: string) => boolean) {
  return [mountPoint, ...candidates].find(folder => isUsable(folder))
}

/**
 * Check if the drive can host the test file while keeping the safety margin free
 * @param freeBytes free space on the drive
 * @param config the benchmark config
 * @returns true if the benchmark can run safely
 */
export function hasEnoughSpace(freeBytes: number, config = defaultConfig) {
  return freeBytes >= config.fileSize + config.safetyMargin
}

/**
 * Format a byte count for humans
 * @param bytes the byte count
 * @returns the formatted size
 * @example formatBytes(1536) // '1.5 KB'
 */
export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let unitIndex = 0
  while (value >= kilobyte && unitIndex < units.length - 1) {
    value /= kilobyte
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * Format a speed for humans
 * @param speed the speed in MB/s
 * @returns the formatted speed
 * @example formatSpeed(12.345) // '12.35 MB/s'
 */
export function formatSpeed(speed: number) {
  return `${speed.toFixed(speedDecimals)} MB/s`
}

/**
 * Tell if a drive can be benchmarked : writable and with enough free space
 * @param drive the drive
 * @returns true if the drive can be selected
 */
export function isSelectableDrive(drive: Drive) {
  return drive.testFolder !== undefined && hasEnoughSpace(drive.freeBytes)
}

/**
 * Move the selection to the next selectable drive in a direction, wrapping around the list
 * @param drives the listed drives
 * @param current the current index, -1 to start before the first drive
 * @param step 1 to go down, -1 to go up
 * @returns the new index, or the current one if no other drive is selectable
 */
export function moveSelection(drives: readonly Drive[], current: number, step: 1 | -1) {
  const { length } = drives
  for (let offset = 1; offset <= length; offset += 1) {
    const index = (((current + step * offset) % length) + length) % length
    const drive = drives[index]
    if (drive !== undefined && isSelectableDrive(drive)) return index
  }
  return current
}

/**
 * Parse the drive number typed by the user, used when the input is not an interactive terminal
 * @param input the user input, 1-based
 * @param drives the listed drives
 * @returns the selected drive or an error message
 */
export function parseDriveChoice(input: string, drives: readonly Drive[]): { drive: Drive } | { error: string } {
  const choice = input.trim()
  const drive = drives[Math.trunc(Number(choice)) - 1]
  if (drive === undefined) return { error: `Invalid choice "${choice}", type a number between 1 and ${drives.length}` }
  if (drive.testFolder === undefined) return { error: `No writable folder found on ${drive.mountPoint}` }
  if (!hasEnoughSpace(drive.freeBytes)) return { error: `Not enough free space on ${drive.mountPoint}, ${formatBytes(defaultConfig.fileSize + defaultConfig.safetyMargin)} are needed` }
  return { drive }
}

/**
 * Get the offset to apply to a buffer so its data starts on an aligned memory address
 * @param address the memory address of the buffer start
 * @param alignment the wanted alignment
 * @returns the offset in bytes
 */
export function alignmentOffset(address: number, alignment = memoryAlignment) {
  return (alignment - (address % alignment)) % alignment
}

/**
 * Pad the columns of the results table
 * @param columns the average, standard deviation and latency columns
 * @returns the padded columns
 */
function resultColumns(columns: readonly string[]) {
  return columns.map(column => column.padStart(speedColumnWidth)).join(' ')
}

/**
 * Format a duration in milliseconds for humans
 * @param ms the duration
 * @returns the formatted duration
 * @example formatLatency(12.345) // '12.35 ms'
 */
export function formatLatency(ms: number) {
  return `${ms.toFixed(speedDecimals)} ms`
}

/**
 * Render the results as an aligned text table
 * @param results the test results
 * @returns the table lines
 */
export function formatResults(results: readonly BenchResult[]) {
  const nameWidth = Math.max(...results.map(result => result.name.length))
  const header = `${'Test'.padEnd(nameWidth)} ${resultColumns(['Average', '± σ', 'Latency'])}`
  const lines = results.map(result => `${result.name.padEnd(nameWidth)} ${resultColumns([formatSpeed(result.average), `± ${formatSpeed(result.deviation)}`, formatLatency(result.latency)])}`)
  return [header, ...lines]
}

/**
 * Describe the data check for humans
 * @param report the benchmark report
 * @returns the description
 */
export function describeDataCheck(report: BenchReport) {
  if (report.dataErrors === 0) return `OK, ${report.dataChecked} blocks and files verified`
  return `${report.dataErrors} of ${report.dataChecked} blocks and files read back with a WRONG content, do not trust this drive`
}

/**
 * Describe the sustained write result for humans
 * @param sustained the sustained result
 * @returns the description
 */
export function describeSustained(sustained: SustainedResult) {
  if (sustained.cacheBytes === undefined) return `no slowdown within ${formatBytes(sustained.testedBytes)}, ${formatSpeed(sustained.speed)}`
  return `${formatBytes(sustained.cacheBytes)} at full speed, then ${formatSpeed(sustained.speed)}`
}

/**
 * Render the extra results under the results table
 * @param report the benchmark report
 * @returns the lines
 */
export function formatReportDetails(report: BenchReport) {
  const lines = [
    ['Data check', describeDataCheck(report)],
    [testNames.sustainedWrite, describeSustained(report.sustained)],
    [testNames.smallFiles, `write ${report.smallFiles.writeRate.toFixed(0)} files/s, read ${report.smallFiles.readRate.toFixed(0)} files/s`],
  ]
  const nameWidth = Math.max(...lines.map(([name = '']) => name.length))
  return lines.map(([name = '', value = '']) => `${name.padEnd(nameWidth)} ${value}`)
}

export type DriveIdentity = {
  brand: string
  /** raw filesystem type, like "exfat" on Linux or "exFAT" on Windows */
  fileSystem: string
  model: string
  serial: string
  sizeBytes: number
  /** Key for removable drives like USB keys, Drive for the others */
  type: 'Drive' | 'Key'
  /** negotiated USB link speed in Mb/s, like 480 or 5000, undefined if unknown or not USB */
  linkSpeed: number | undefined
  /** USB version like 3.2, or PCIe generation for NVMe drives, undefined if unknown */
  version: number | undefined
}

/** sizes printed on the box, in decimal GB */
const marketedSizes = '1 2 4 8 16 32 64 120 128 240 250 256 480 500 512 960 1000 2000 4000 8000 16000'.split(' ').map(Number)
const decimalGigabyte = 1_000_000_000
/** drives can be slightly bigger than announced, like 1000.2 GB for a 1 TB SSD */
const marketedSizeTolerance = 0.99
/** PCIe link speeds in GT/s, the generation is the index + 1 */
const pcieSpeeds = '2.5 5 8 16 32 64'.split(' ')
const hexBase = 16
/** vendors reported by some drives instead of their real brand, like SanDisk keys saying "USB" */
const genericVendors = new Set(['', 'ATA', 'GENERIC', 'USB'])
/** BOS device capability descriptors : bLength, bDescriptorType, bDevCapabilityType */
const capabilityTypeOffset = 2
/** max speed in Mb/s announced by the SuperSpeed (0x03) and SuperSpeedPlus (0x0A) device capabilities */
const superSpeedCapability = 0x03
const superSpeedPlusCapability = 0x0a
const superSpeedMbps = 5000
const superSpeedPlusMbps = 10_000
const usbCapabilitySpeeds = new Map([
  [superSpeedCapability, superSpeedMbps],
  [superSpeedPlusCapability, superSpeedPlusMbps],
])
const megabitsInGigabit = 1000
const windows11FirstBuild = 22_000
const spreadsheetSpeedDecimals = 2

/**
 * Get the size printed on the box from the real drive size, drives are always a bit smaller than announced
 * @param bytes the real drive size
 * @returns the marketed size in decimal GB
 * @example marketedSizeGb(62_008_590_336) // 64
 */
export function marketedSizeGb(bytes: number) {
  const gigabytes = bytes / decimalGigabyte
  return marketedSizes.find(size => size >= gigabytes * marketedSizeTolerance) ?? Math.round(gigabytes)
}

/**
 * Get the PCIe generation from a link speed
 * @param linkSpeed the link speed, like "16.0 GT/s PCIe"
 * @returns the PCIe generation, like 4, or undefined if unknown
 */
export function pcieGeneration(linkSpeed: string) {
  const speed = /^[\d.]+/u.exec(linkSpeed)?.[0] ?? ''
  const index = pcieSpeeds.indexOf(String(Number(speed)))
  return index === -1 ? undefined : index + 1
}

/**
 * Parse the USB version announced by a device
 * @param version the version, like " 3.20"
 * @returns the version, like 3.2, or undefined if unknown
 */
export function parseUsbVersion(version: string) {
  const parsed = Number(version)
  return version.trim() === '' || Number.isNaN(parsed) ? undefined : parsed
}

/**
 * Parse the output of "udevadm info --query=property"
 * @param output the command output, one KEY=value per line
 * @returns the properties
 */
export function parseUdevProperties(output: string) {
  const properties = new Map<string, string>()
  for (const line of output.split('\n')) {
    const separator = line.indexOf('=')
    if (separator > 0) properties.set(line.slice(0, separator), line.slice(separator + 1))
  }
  return properties
}

/**
 * Decode the hex escapes used by udev, like "\x20" for a space
 * @param value the escaped value
 * @returns the decoded and trimmed value
 * @example decodeUdevValue('DataTraveler\\x203.0') // 'DataTraveler 3.0'
 */
export function decodeUdevValue(value: string) {
  return value.replaceAll(/\\x(?<code>[\da-f]{2})/giu, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, hexBase))).trim()
}

/**
 * Split the brand from the model, when the vendor is missing or generic the brand is the first word of the model
 * @param vendor the vendor reported by the drive, like "Kingston", or a generic one like "ATA" or "USB"
 * @param model the model reported by the drive, like "DataTraveler 3.0" or "WD_BLACK SN850X HS 4000GB"
 * @returns the brand and the model
 */
export function splitBrandModel(vendor: string, model: string) {
  const cleanModel = model.replace(/\s+USB Device$/iu, '').trim()
  if (!genericVendors.has(vendor.toUpperCase())) return { brand: vendor, model: cleanModel.replace(new RegExp(`^${vendor}\\s+`, 'iu'), '') }
  const [brand = '', ...rest] = cleanModel.split(/\s+/u)
  return { brand, model: rest.join(' ') }
}

/**
 * Name a filesystem like in the spreadsheet
 * @param fileSystem the raw filesystem type, like "exfat" or "ntfs3"
 * @returns the spreadsheet name, like "exFat" or "NTFS"
 */
export function fileSystemName(fileSystem: string) {
  const lower = fileSystem.toLowerCase()
  if (lower === 'exfat') return 'exFat'
  if (lower.startsWith('ntfs') || lower === 'fuseblk') return 'NTFS'
  if (lower === 'vfat' || lower.startsWith('fat')) return 'FAT32'
  return lower
}

/**
 * Get the Windows name from the OS release
 * @param osRelease the release, like "10.0.22631"
 * @returns the name, like "Windows 11"
 */
export function windowsName(osRelease: string) {
  const build = Number(osRelease.split('.').at(-1))
  return build >= windows11FirstBuild ? 'Windows 11' : 'Windows 10'
}

/**
 * Get the Linux distribution name from /etc/os-release
 * @param content the content of /etc/os-release
 * @returns the name, like "Linux Mint 22"
 */
export function linuxName(content: string) {
  const read = (key: string) => new RegExp(`^${key}="?(?<value>[^"\\n]*)"?$`, 'mu').exec(content)?.groups?.value ?? ''
  const name = `${read('NAME')} ${read('VERSION_ID')}`.trim()
  return name === '' ? 'Linux' : name
}

/**
 * Format a number for a spreadsheet using a comma as decimal separator
 * @param value the number
 * @param decimals the number of decimals
 * @returns the formatted number, like "3,2"
 */
function spreadsheetNumber(value: number, decimals: number) {
  return value.toFixed(decimals).replace('.', ',')
}

/**
 * Build a spreadsheet row, tab separated, to fill the columns from C (Type) to V (Small files read)
 * @param identity the drive identity
 * @param osName the operating system name
 * @param report the benchmark report
 * @returns the row to paste in the spreadsheet
 */
export function spreadsheetRow(identity: DriveIdentity, osName: string, report: BenchReport) {
  const result = (name: string) => report.results.find(item => item.name === name)
  const speed = (name: string) => {
    const found = result(name)
    return found === undefined ? '' : spreadsheetNumber(found.average, spreadsheetSpeedDecimals)
  }
  const latency = (name: string) => {
    const found = result(name)
    return found === undefined ? '' : spreadsheetNumber(found.latency, spreadsheetSpeedDecimals)
  }
  const optional = (value: number | undefined, decimals: number) => (value === undefined ? '' : spreadsheetNumber(value, decimals))
  const identityCells = [identity.type, identity.brand, identity.model, optional(identity.version, 1), identity.serial, String(marketedSizeGb(identity.sizeBytes)), osName, fileSystemName(identity.fileSystem)]
  const speeds = [testNames.sequentialWrite, testNames.sequentialRead, testNames.randomWrite, testNames.randomRead].map(name => speed(name))
  const dataCheck = report.dataErrors === 0 ? 'OK' : `${report.dataErrors} errors`
  const { sustained } = report
  // without slowdown, the bytes written at full speed are a lower bound of the cache, and keep the column numeric for color scales
  const cacheGb = (sustained.cacheBytes ?? sustained.testedBytes) / decimalGigabyte
  const extraCells = [
    optional(identity.linkSpeed, 0),
    dataCheck,
    latency(testNames.randomWrite),
    latency(testNames.randomRead),
    spreadsheetNumber(cacheGb, spreadsheetSpeedDecimals),
    spreadsheetNumber(sustained.speed, spreadsheetSpeedDecimals),
    spreadsheetNumber(report.smallFiles.writeRate, 0),
    spreadsheetNumber(report.smallFiles.readRate, 0),
  ]
  return [...identityCells, ...speeds, ...extraCells].join('\t')
}

/**
 * Tell if the answer to a yes/no question is yes
 * @param answer the user answer
 * @param isYesByDefault the result of an empty answer
 * @returns true if the user accepted
 */
export function isYes(answer: string, isYesByDefault = true) {
  const clean = answer.trim().toLowerCase()
  if (clean === '') return isYesByDefault
  return ['y', 'yes', 'o', 'oui'].includes(clean)
}

/**
 * Get the max speed a USB device supports from its BOS descriptor, that USB 2.1+ devices expose even on a USB 2 link
 * @param bos the raw BOS descriptor, as found in sysfs bos_descriptors
 * @returns the max speed in Mb/s, or undefined if the device does not announce USB 3 support
 */
export function usbMaxSpeedFromBos(bos: Uint8Array) {
  let maxSpeed: number | undefined = undefined
  // the first descriptor is the BOS header, device capabilities follow
  let offset = bos[0] ?? bos.length
  while (offset < bos.length) {
    const length = bos[offset]
    invariant(length !== undefined, 'BOS descriptor offset out of bounds')
    if (length === 0) break
    const speed = usbCapabilitySpeeds.get(bos[offset + capabilityTypeOffset] ?? 0)
    if (speed !== undefined) maxSpeed = Math.max(maxSpeed ?? 0, speed)
    offset += length
  }
  return maxSpeed
}

/**
 * Format a USB link speed for humans
 * @param mbps the speed in Mb/s
 * @returns the formatted speed
 * @example formatLinkSpeed(5000) // '5 Gb/s'
 */
function formatLinkSpeed(mbps: number) {
  return mbps >= megabitsInGigabit ? `${mbps / megabitsInGigabit} Gb/s` : `${mbps} Mb/s`
}

/** USB modes by link speed, with the real world max transfer speed of each */
const usbModes = [
  { linkSpeed: 12, name: 'USB 1.1', practicalMaxSpeed: 1 },
  { linkSpeed: 480, name: 'USB 2.0', practicalMaxSpeed: 40 },
  { linkSpeed: 5000, name: 'USB 3.2 Gen 1', practicalMaxSpeed: 450 },
  { linkSpeed: 10_000, name: 'USB 3.2 Gen 2', practicalMaxSpeed: 1000 },
  { linkSpeed: 20_000, name: 'USB 3.2 Gen 2x2', practicalMaxSpeed: 2000 },
]

/**
 * Describe a USB link speed with its USB name
 * @param linkSpeed the speed in Mb/s
 * @returns the description, like "USB 2.0 (480 Mb/s)"
 */
function describeUsbSpeed(linkSpeed: number) {
  const mode = usbModes.find(item => item.linkSpeed === linkSpeed)
  return mode === undefined ? formatLinkSpeed(linkSpeed) : `${mode.name} (${formatLinkSpeed(linkSpeed)})`
}

/**
 * Explain when a USB device runs slower than it can, like a USB 3 key in a USB 2 port
 * @param linkSpeed the negotiated link speed in Mb/s
 * @param maxSpeed the max speed supported by the device in Mb/s
 * @returns the warning, or undefined if the link is fine
 */
export function usbLinkWarning(linkSpeed: number, maxSpeed: number | undefined) {
  if (maxSpeed === undefined || linkSpeed >= maxSpeed) return undefined
  const linkMode = usbModes.find(item => item.linkSpeed === linkSpeed)
  const impact = linkMode === undefined ? 'so speeds will be capped by the connection' : `so speeds will be capped around ${linkMode.practicalMaxSpeed} MB/s`
  const slowPort = linkMode === undefined ? 'a slower port' : `a ${linkMode.name} port`
  return `This drive supports ${describeUsbSpeed(maxSpeed)} but runs in ${describeUsbSpeed(linkSpeed)} mode, ${impact}. Usual causes: ${slowPort}, a hub or extension cable, or the drive inserted too slowly.`
}

export type BenchContext = {
  config: BenchConfig
  file: BenchFile
  /** true when the user asked to stop, checked between operations */
  isAborted: () => boolean
  /** current time in milliseconds */
  now: () => number
  /** called each time the progress percent increases */
  onProgress: (name: string, percent: number, speed: number) => void
  /** random number in [0, 1[ */
  random: () => number
  /** random id stamped in each block, so a block read back from another run or another position is detected */
  runId: number
}

/** file operations used by the small files test, the files are created in a dedicated folder */
export type SmallFilesOps = {
  read: (index: number, buffer: Uint8Array, length: number) => void
  /** make sure every file written so far is stored on the drive */
  syncAll: () => void
  write: (index: number, data: Uint8Array) => void
}

type Measure = { bytes: number; ms: number }

/** a cached or very fast operation can be below the timer resolution */
const minDurationMs = 0.001
/** number of latest operations used to compute the live speed */
const nbLatestMeasures = 5
const nbByteValues = 256
/** each block starts with the run id and the block index, as 2 unsigned 32 bits integers */
const stampIndexOffset = 4
const stampSize = 8

/**
 * Generate block positions in a random order, each block appearing once, so the drive or OS cannot serve a block from a cache
 * @param nbBlocks number of blocks in the file
 * @param blockSize size of a block
 * @param random random number generator
 * @returns the shuffled positions in bytes
 */
export function shuffledPositions(nbBlocks: number, blockSize: number, random: () => number) {
  const positions = Array.from({ length: nbBlocks }, (_value, index) => index * blockSize)
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const current = positions[index]
    const swapped = positions[target]
    invariant(current !== undefined && swapped !== undefined, 'shuffled positions out of bounds')
    positions[index] = swapped
    positions[target] = current
  }
  return positions
}

/**
 * Convert bytes processed in a duration to a speed
 * @param bytes processed bytes
 * @param ms duration in milliseconds
 * @returns the speed in MB/s
 */
export function toSpeed(bytes: number, ms: number) {
  return bytes / megabyte / (Math.max(ms, minDurationMs) / nbMsInSecond)
}

/**
 * Aggregate the measures of a test
 * @param name the test name
 * @param measures the measures, one per operation
 * @returns the test result
 */
export function computeResult(name: string, measures: readonly Measure[]): BenchResult {
  if (measures.length === 0) return { average: 0, deviation: 0, latency: 0, name, nbOperations: 0 }
  let bytes = 0
  let ms = 0
  for (const measure of measures) {
    bytes += measure.bytes
    ms += measure.ms
  }
  const average = toSpeed(bytes, ms)
  const meanMs = ms / measures.length
  if (measures.length === 1) return { average, deviation: 0, latency: meanMs, name, nbOperations: 1 }
  // sample standard deviation of the durations, like hyperfine
  let squaredGaps = 0
  for (const measure of measures) {
    const gap = measure.ms - meanMs
    squaredGaps += gap * gap
  }
  const variance = squaredGaps / (measures.length - 1)
  const deviation = meanMs === 0 ? 0 : (average * Math.sqrt(variance)) / meanMs
  return { average, deviation, latency: meanMs, name, nbOperations: measures.length }
}

/**
 * Write the run id and the block index at the start of a block
 * @param buffer the block
 * @param runId the run id
 * @param index the block index
 */
export function stampBlock(buffer: Uint8Array, runId: number, index: number) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, stampSize)
  view.setUint32(0, runId)
  view.setUint32(stampIndexOffset, index)
}

/**
 * Compare the first bytes of two buffers
 * @param actual the buffer read from the drive
 * @param expected the buffer written to the drive
 * @param length the number of bytes to compare
 * @returns true if they are identical
 */
export function isSameContent(actual: Uint8Array, expected: Uint8Array, length: number) {
  return Buffer.from(actual.buffer, actual.byteOffset, length).equals(Buffer.from(expected.buffer, expected.byteOffset, length))
}

export type SustainedState = {
  /** bytes written since the start of the stream */
  bytes: number
  /** bytes written before the speed dropped, undefined while the drive is still fast */
  cacheBytes: number | undefined
  peakSpeed: number
  /** bytes and duration of the writes since the speed dropped */
  slowBytes: number
  slowMs: number
}

/**
 * Create the state tracking the write speed of the sustained test
 * @param bytes bytes already written, like the unmeasured warm up blocks
 * @returns the initial state
 */
export function createSustainedState(bytes = 0): SustainedState {
  return { bytes, cacheBytes: undefined, peakSpeed: 0, slowBytes: 0, slowMs: 0 }
}

/**
 * Update the sustained test state with the writes of a time window
 * @param state the current state
 * @param window the bytes written and the time spent writing during the window
 * @param config the benchmark config
 * @returns the new state
 */
export function updateSustained(state: SustainedState, window: Measure, config: BenchConfig): SustainedState {
  const speed = toSpeed(window.bytes, window.ms)
  const bytes = state.bytes + window.bytes
  const threshold = state.peakSpeed * config.sustainedDropRatio
  if (state.cacheBytes === undefined) {
    if (speed < threshold) return { ...state, bytes, cacheBytes: state.bytes, slowBytes: window.bytes, slowMs: window.ms }
    return { ...state, bytes, peakSpeed: Math.max(state.peakSpeed, speed) }
  }
  // fast again : it was a hiccup, not the end of the cache
  if (speed >= threshold) return { ...state, bytes, cacheBytes: undefined, slowBytes: 0, slowMs: 0 }
  return { ...state, bytes, slowBytes: state.slowBytes + window.bytes, slowMs: state.slowMs + window.ms }
}

/**
 * Let the event loop breathe (to catch Ctrl+C) and stop if the user asked to
 * @param context the benchmark context
 */
async function checkpoint(context: BenchContext) {
  await sleep(0)
  if (context.isAborted()) throw new Error('Benchmark aborted by user')
}

/**
 * Time a single operation
 * @param context the benchmark context
 * @param operation the operation to time
 * @returns the duration in milliseconds
 */
function timeIt(context: BenchContext, operation: () => void) {
  const startedAt = context.now()
  operation()
  return context.now() - startedAt
}

/**
 * Track the progress of a test and notify only when the percent increases
 * @param context the benchmark context
 * @param name the test name
 * @returns a function to call after each operation, resolving after a checkpoint when the percent changed
 */
function progressTracker(context: BenchContext, name: string) {
  let lastPercent = -1
  return async (percent: number, measures: readonly Measure[]) => {
    const rounded = Math.min(nbPercentMax, Math.floor(percent))
    if (rounded <= lastPercent) return
    lastPercent = rounded
    context.onProgress(name, rounded, computeResult(name, measures.slice(-nbLatestMeasures)).average)
    await checkpoint(context)
  }
}

/**
 * Feed the sustained state with write measures, grouped by time windows
 * @param context the benchmark context
 * @param initialBytes bytes already written before the first measure
 * @returns a function to call after each write, and a getter on the current state
 */
function sustainedTracker(context: BenchContext, initialBytes: number) {
  let state = createSustainedState(initialBytes)
  let window: Measure = { bytes: 0, ms: 0 }
  let windowStart = context.now()
  return {
    add: (measure: Measure) => {
      window = { bytes: window.bytes + measure.bytes, ms: window.ms + measure.ms }
      const now = context.now()
      if (now - windowStart < context.config.sustainedWindowMs) return
      state = updateSustained(state, window, context.config)
      window = { bytes: 0, ms: 0 }
      windowStart = now
    },
    state: () => state,
  }
}

/**
 * Write the whole test file sequentially with big blocks, after a short unmeasured warm up at the start of the file
 * Each block is stamped with its index so the sequential read can verify it
 * @param context the benchmark context
 * @param buffer aligned buffer filled with random data, at least bigBlockSize long
 * @returns the test result, and the sustained tracker fed with every measured write
 */
async function writeTestFile(context: BenchContext, buffer: Uint8Array) {
  const { bigBlockSize, fileSize, warmUpRatio } = context.config
  const nbBlocks = Math.floor(fileSize / bigBlockSize)
  const nbWarmUpBlocks = Math.ceil(nbBlocks * warmUpRatio)
  for (let index = 0; index < nbWarmUpBlocks; index += 1) {
    stampBlock(buffer, context.runId, index)
    context.file.write(buffer, bigBlockSize, index * bigBlockSize)
    // oxlint-disable-next-line no-await-in-loop
    await checkpoint(context)
  }
  const measures: Measure[] = []
  const progress = progressTracker(context, testNames.sequentialWrite)
  const sustained = sustainedTracker(context, nbWarmUpBlocks * bigBlockSize)
  for (let index = 0; index < nbBlocks; index += 1) {
    stampBlock(buffer, context.runId, index)
    const ms = timeIt(context, () => {
      context.file.write(buffer, bigBlockSize, index * bigBlockSize)
    })
    measures.push({ bytes: bigBlockSize, ms })
    sustained.add({ bytes: bigBlockSize, ms })
    // oxlint-disable-next-line no-await-in-loop
    await progress(((index + 1) / nbBlocks) * nbPercentMax, measures)
  }
  return { result: computeResult(testNames.sequentialWrite, measures), sustained }
}

/**
 * Write the test file like the classic sequential write test, and find the size of the write cache and the speed once it is full
 * @param context the benchmark context
 * @param buffer aligned buffer filled with random data, at least bigBlockSize long
 * @returns the classic sequential write result and the sustained result
 */
export async function runSequentialWrite(context: BenchContext, buffer: Uint8Array) {
  const { result, sustained } = await writeTestFile(context, buffer)
  const state = sustained.state()
  if (state.cacheBytes !== undefined) return { result, sustained: { cacheBytes: state.cacheBytes, speed: toSpeed(state.slowBytes, state.slowMs), testedBytes: state.bytes } }
  return { result, sustained: { cacheBytes: undefined, speed: result.average, testedBytes: state.bytes } }
}

/**
 * Read the whole test file sequentially with big blocks and verify each block content
 * @param context the benchmark context
 * @param written the buffer used to write the test file
 * @param buffer aligned buffer receiving the reads, at least bigBlockSize long
 * @returns the test result and the number of blocks with an unexpected content
 */
export async function runSequentialRead(context: BenchContext, written: Uint8Array, buffer: Uint8Array) {
  const { bigBlockSize, fileSize } = context.config
  const nbBlocks = Math.floor(fileSize / bigBlockSize)
  const measures: Measure[] = []
  const progress = progressTracker(context, testNames.sequentialRead)
  let dataErrors = 0
  for (let index = 0; index < nbBlocks; index += 1) {
    const ms = timeIt(context, () => {
      context.file.read(buffer, bigBlockSize, index * bigBlockSize)
    })
    measures.push({ bytes: bigBlockSize, ms })
    stampBlock(written, context.runId, index)
    if (!isSameContent(buffer, written, bigBlockSize)) dataErrors += 1
    // oxlint-disable-next-line no-await-in-loop
    await progress(((index + 1) / nbBlocks) * nbPercentMax, measures)
  }
  return { dataErrors, nbBlocks, result: computeResult(testNames.sequentialRead, measures) }
}

/**
 * Read or write small blocks at shuffled positions inside the test file, until every block is touched or the time is up
 * @param context the benchmark context
 * @param kind read or write
 * @param pool aligned buffer, a multiple of smallBlockSize, filled with random data for writes
 * @returns the test result
 */
async function runRandom(context: BenchContext, kind: 'read' | 'write', pool: Uint8Array) {
  const { fileSize, maxRandomBlocks, randomTestDurationMs, smallBlockSize } = context.config
  const name = kind === 'read' ? testNames.randomRead : testNames.randomWrite
  const positions = shuffledPositions(Math.floor(fileSize / smallBlockSize), smallBlockSize, context.random).slice(0, maxRandomBlocks)
  const nbPoolBlocks = Math.floor(pool.length / smallBlockSize)
  const measures: Measure[] = []
  const progress = progressTracker(context, name)
  const startedAt = context.now()
  for (const [index, position] of positions.entries()) {
    const poolStart = (index % nbPoolBlocks) * smallBlockSize
    const block = pool.subarray(poolStart, poolStart + smallBlockSize)
    // change the block content, in case a clever drive notices the same block being written again
    if (kind === 'write') block[0] = Math.floor(context.random() * nbByteValues)
    const ms = timeIt(context, () => {
      context.file[kind](block, smallBlockSize, position)
    })
    measures.push({ bytes: smallBlockSize, ms })
    const percentByTime = ((context.now() - startedAt) / randomTestDurationMs) * nbPercentMax
    const percentByBlocks = ((index + 1) / positions.length) * nbPercentMax
    const percent = Math.max(percentByTime, percentByBlocks)
    // oxlint-disable-next-line no-await-in-loop
    await progress(percent, measures)
    if (percent >= nbPercentMax) break
  }
  return computeResult(name, measures)
}

/**
 * Write small blocks at random positions inside the test file
 * @param context the benchmark context
 * @param pool aligned buffer filled with random data, a multiple of smallBlockSize
 * @returns the test result
 */
export function runRandomWrite(context: BenchContext, pool: Uint8Array) {
  return runRandom(context, 'write', pool)
}

/**
 * Read small blocks at random positions inside the test file
 * @param context the benchmark context
 * @param pool aligned buffer, a multiple of smallBlockSize
 * @returns the test result
 */
export function runRandomRead(context: BenchContext, pool: Uint8Array) {
  return runRandom(context, 'read', pool)
}

/**
 * Pick the size of each small file, a multiple of 4 KB between 4 KB and smallFileMaxSize, like documents or photos thumbnails
 * @param config the benchmark config
 * @param random random number generator
 * @returns the file sizes
 */
export function smallFileSizes(config: BenchConfig, random: () => number) {
  const nbSizes = config.smallFileMaxSize / config.smallBlockSize
  return Array.from({ length: config.smallFilesCount }, () => (Math.floor(random() * nbSizes) + 1) * config.smallBlockSize)
}

/**
 * Write the small files then make sure they are stored on the drive
 * @param context the benchmark context
 * @param ops the file operations
 * @param files the files sizes and the aligned buffer filled with random data
 * @param files.sizes the files sizes
 * @param files.data the aligned buffer filled with random data
 * @returns the time spent in milliseconds
 */
async function writeSmallFiles(context: BenchContext, ops: SmallFilesOps, files: { data: Uint8Array; sizes: readonly number[] }) {
  const progress = progressTracker(context, testNames.smallFiles)
  const measures: Measure[] = []
  const startedAt = context.now()
  for (const [index, size] of files.sizes.entries()) {
    stampBlock(files.data, context.runId, index)
    const ms = timeIt(context, () => {
      ops.write(index, files.data.subarray(0, size))
    })
    measures.push({ bytes: size, ms })
    // oxlint-disable-next-line no-await-in-loop
    await progress(((index + 1) / files.sizes.length) * nbPercentMax, measures)
  }
  ops.syncAll()
  return context.now() - startedAt
}

/**
 * Read the small files back and verify their content
 * @param context the benchmark context
 * @param ops the file operations
 * @param files the files sizes, the buffer used to write them and the aligned buffer receiving the reads
 * @param files.sizes the files sizes
 * @param files.data the buffer used to write them
 * @param files.buffer the aligned buffer receiving the reads
 * @returns the time spent in milliseconds and the number of files with an unexpected content
 */
async function readSmallFiles(context: BenchContext, ops: SmallFilesOps, files: { buffer: Uint8Array; data: Uint8Array; sizes: readonly number[] }) {
  const progress = progressTracker(context, testNames.smallFiles)
  const measures: Measure[] = []
  let dataErrors = 0
  const startedAt = context.now()
  for (const [index, size] of files.sizes.entries()) {
    const ms = timeIt(context, () => {
      ops.read(index, files.buffer, size)
    })
    measures.push({ bytes: size, ms })
    stampBlock(files.data, context.runId, index)
    if (!isSameContent(files.buffer, files.data, size)) dataErrors += 1
    // oxlint-disable-next-line no-await-in-loop
    await progress(((index + 1) / files.sizes.length) * nbPercentMax, measures)
  }
  return { dataErrors, ms: context.now() - startedAt }
}

/**
 * Write many small files then read them back, like copying a folder of documents, and verify their content
 * @param context the benchmark context
 * @param ops the file operations
 * @param buffers aligned buffers of at least smallFileMaxSize
 * @param buffers.data filled with random data, used to write the files
 * @param buffers.buffer receives the reads
 * @returns the files rates and the number of files with an unexpected content
 */
export async function runSmallFiles(context: BenchContext, ops: SmallFilesOps, buffers: { buffer: Uint8Array; data: Uint8Array }) {
  const sizes = smallFileSizes(context.config, context.random)
  const writeMs = await writeSmallFiles(context, ops, { data: buffers.data, sizes })
  const read = await readSmallFiles(context, ops, { ...buffers, sizes })
  const filesPerSecond = (ms: number) => sizes.length / (Math.max(ms, minDurationMs) / nbMsInSecond)
  return { dataErrors: read.dataErrors, nbFiles: sizes.length, smallFiles: { readRate: filesPerSecond(read.ms), writeRate: filesPerSecond(writeMs) } }
}

/* v8 ignore start */

type FfiType = 'bool' | 'i32' | 'i64' | 'ptr' | 'u32' | 'u64'

/** the bun:ffi parts used here, typed locally to avoid pulling @types/bun globals into the whole repo */
type BunFfi = {
  dlopen: <Definitions extends Record<string, { args?: readonly FfiType[]; returns?: FfiType }>>(
    name: string,
    symbols: Definitions,
  ) => { close: () => void; symbols: { [Name in keyof Definitions]: (...args: readonly unknown[]) => bigint | number } }
  ptr: (view: ArrayBufferView) => number
}

/** imported at runtime only, so the unit tests can load this file with Node */
const bunFfiModule = 'bun:ffi'

type OpenedFile = BenchFile & { close: () => void }

const ownerReadWrite = 0o600

/**
 * Allocate a buffer starting on an aligned memory address, as required by direct I/O
 * @param size the buffer size
 * @param getAddress bun:ffi ptr function, giving the memory address of a buffer
 * @returns the aligned buffer
 */
function alignedBuffer(size: number, getAddress: BunFfi['ptr']) {
  const raw = new Uint8Array(size + memoryAlignment)
  const offset = alignmentOffset(getAddress(raw))
  return raw.subarray(offset, offset + size)
}

/**
 * Throw if a direct I/O call did not process the whole block
 * @param done bytes processed
 * @param length bytes expected
 * @param action the action name
 */
function checkLength(done: number, length: number, action: string) {
  if (done !== length) throw new Error(`Partial ${action} : ${done} bytes instead of ${length}`)
}

/**
 * Open a file on Linux, with O_DIRECT to bypass the page cache and O_DSYNC to wait for the device on each write
 * When creating, O_EXCL guarantees an existing file is never opened, so only data created by the benchmark is written
 * @param filePath the file path
 * @param mode create a new file to read and write, or open a file created by the benchmark to read it
 * @returns the opened file
 */
function openLinuxFile(filePath: string, mode: 'create' | 'read'): OpenedFile {
  // oxlint-disable-next-line no-bitwise
  const createFlags = constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_DIRECT | constants.O_DSYNC
  // oxlint-disable-next-line no-bitwise
  const readFlags = constants.O_RDONLY | constants.O_DIRECT
  const fd = openSync(filePath, mode === 'create' ? createFlags : readFlags, ownerReadWrite)
  return {
    close: () => {
      closeSync(fd)
    },
    read: (buffer, length, position) => {
      checkLength(readSync(fd, buffer, 0, length, position), length, 'read')
    },
    write: (buffer, length, position) => {
      checkLength(writeSync(fd, buffer, 0, length, position), length, 'write')
    },
  }
}

const genericReadWrite = 0xc0_00_00_00
const genericRead = 0x80_00_00_00
const shareReadWrite = 0x3
const createNew = 1
const openExisting = 3
/** FILE_ATTRIBUTE_NORMAL (0x80) + FILE_FLAG_NO_BUFFERING (0x20000000) + FILE_FLAG_WRITE_THROUGH (0x80000000), same flags as NetCoreStorageSpeedTest */
const unbufferedWriteThrough = 0xa0_00_00_80
const fileBegin = 0
const invalidHandle = -1

/**
 * Load the kernel32 functions used to read and write without the Windows cache
 * @param load bun:ffi dlopen function
 * @returns the kernel32 functions
 */
function loadKernel32(load: BunFfi['dlopen']) {
  return load('kernel32.dll', {
    CloseHandle: { args: ['i64'], returns: 'bool' },
    CreateFileW: { args: ['ptr', 'u32', 'u32', 'ptr', 'u32', 'u32', 'ptr'], returns: 'i64' },
    GetLastError: { args: [], returns: 'u32' },
    ReadFile: { args: ['i64', 'ptr', 'u32', 'ptr', 'ptr'], returns: 'bool' },
    SetFilePointerEx: { args: ['i64', 'i64', 'ptr', 'u32'], returns: 'bool' },
    WriteFile: { args: ['i64', 'ptr', 'u32', 'ptr', 'ptr'], returns: 'bool' },
  }).symbols
}

/**
 * Open a file on Windows without the Windows cache, Node cannot set FILE_FLAG_NO_BUFFERING so kernel32 is called directly
 * When creating, CREATE_NEW guarantees an existing file is never opened, so only data created by the benchmark is written
 * @param filePath the file path
 * @param kernel32 the kernel32 functions
 * @param mode create a new file to read and write, or open a file created by the benchmark to read it
 * @returns the opened file
 */
function openWindowsFile(filePath: string, kernel32: ReturnType<typeof loadKernel32>, mode: 'create' | 'read'): OpenedFile {
  const { CloseHandle: closeHandle, CreateFileW: createFile, GetLastError: getLastError, ReadFile: readFile, SetFilePointerEx: setFilePointer, WriteFile: writeFile } = kernel32
  const fail = (action: string) => new Error(`${action} failed with Windows error code ${String(getLastError())}`)
  const widePath = Buffer.from(`${filePath}\0`, 'utf16le')
  const access = mode === 'create' ? genericReadWrite : genericRead
  const disposition = mode === 'create' ? createNew : openExisting
  const handle = createFile(widePath, access, shareReadWrite, undefined, disposition, unbufferedWriteThrough, undefined)
  if (Number(handle) === invalidHandle) throw fail('CreateFileW')
  const transferred = new Uint32Array(1)
  const seek = (position: number) => {
    if (!setFilePointer(handle, position, undefined, fileBegin)) throw fail('SetFilePointerEx')
  }
  return {
    close: () => {
      closeHandle(handle)
    },
    read: (buffer, length, position) => {
      seek(position)
      if (!readFile(handle, buffer, length, transferred, undefined)) throw fail('ReadFile')
      checkLength(transferred[0] ?? 0, length, 'read')
    },
    write: (buffer, length, position) => {
      seek(position)
      if (!writeFile(handle, buffer, length, transferred, undefined)) throw fail('WriteFile')
      checkLength(transferred[0] ?? 0, length, 'write')
    },
  }
}

const logger = new Logger()
const isWindows = process.platform === 'win32'
const driveLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const nameWidth = 24
const speedWidth = 14
const percentWidth = 3
/** carriage return + ANSI erase line, to replace the progress line */
const clearLine = '\r\u001B[2K'
const hideCursor = '\u001B[?25l'
const showCursor = '\u001B[?25h'
/**
 * Move the terminal cursor up
 * @param nbLines number of lines to go up
 * @returns the ANSI sequence
 */
const cursorUp = (nbLines: number) => `\u001B[${nbLines}A`
const firstArgumentIndex = 2
/** run ids are stored as unsigned 32 bits integers */
const nbUint32Values = 4_294_967_296
/** sysfs block sizes are always counted in 512 bytes sectors */
const linuxSectorSize = 512
/** Win32_LogicalDisk DriveType of removable drives like USB keys */
const windowsRemovableDriveType = 2
let isAborted = false

/**
 * Check if a folder is writable and lives on the given device
 * @param folder the folder to check
 * @param deviceId the device id, as returned by stat
 * @returns true if the test file can be created there
 */
function isUsableFolder(folder: string, deviceId: number) {
  try {
    accessSync(folder, constants.W_OK)
    return statSync(folder).dev === deviceId
  } catch {
    return false
  }
}

/**
 * Build a drive from its mount point, reading its size and free space
 * @param mountPoint the mount point, like "/media/key" or "C:\"
 * @param device the device name
 * @param fsType the filesystem type
 * @returns the drive, or undefined if it cannot be read
 */
function readDrive(mountPoint: string, device: string, fsType: string): Drive | undefined {
  try {
    const stats = statfsSync(mountPoint)
    const deviceId = statSync(mountPoint).dev
    const testFolder = pickTestFolder(mountPoint, [homedir(), tmpdir()], folder => isUsableFolder(folder, deviceId))
    return { device, freeBytes: stats.bavail * stats.bsize, fsType, mountPoint, testFolder, totalBytes: stats.blocks * stats.bsize }
  } catch {
    return undefined
  }
}

/**
 * List the drives available on this computer
 * @returns the drives
 */
function listDrives() {
  if (isWindows)
    return driveLetters.flatMap(letter => {
      const root = `${letter}:\\`
      if (!existsSync(root)) return []
      return readDrive(root, `${letter}:`, '') ?? []
    })
  const entries = parseMounts(readFileSync('/proc/self/mounts', 'utf8'))
  return entries.flatMap(entry => readDrive(entry.mountPoint, entry.device, entry.fsType) ?? [])
}

/**
 * Describe a drive in the selection list
 * @param drive the drive
 * @param marker shown before the drive, like the selection arrow or the drive number
 * @returns the description line
 */
function describeDrive(drive: Drive, marker: string) {
  const details = `${drive.device} ${drive.fsType}`.trim()
  const space = `${formatBytes(drive.freeBytes)} free / ${formatBytes(drive.totalBytes)}`
  let issue = ''
  if (drive.testFolder === undefined) issue = red(' (not writable)')
  else if (!hasEnoughSpace(drive.freeBytes)) issue = red(' (not enough free space)')
  return `  ${marker} ${blue(drive.mountPoint)} ${dim(`[${details}]`)} ${space}${issue}`
}

/**
 * Render the drive list with the selected drive highlighted
 * @param drives the drives
 * @param selected the selected index
 * @returns the lines to display
 */
function renderDriveList(drives: readonly Drive[], selected: number) {
  return drives.map((drive, index) => {
    if (index === selected) return describeDrive(drive, cyan(bold('❯')))
    const line = describeDrive(drive, ' ')
    return isSelectableDrive(drive) ? line : dim(line)
  })
}

/**
 * Let the user pick a drive with the arrow keys
 * @param drives the drives to choose from
 * @returns the selected drive
 */
async function pickDriveWithArrows(drives: readonly Drive[]) {
  let selected = moveSelection(drives, -1, 1)
  if (selected === -1) throw new Error('No drive can be benchmarked : none is writable with enough free space')
  process.stdout.write(`Select the drive to benchmark ${dim('(↑/↓ then Enter, Esc to quit)')}\n${hideCursor}`)
  process.stdout.write(`${renderDriveList(drives, selected).join('\n')}\n`)
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  try {
    for await (const [, key] of on(process.stdin, 'keypress') as AsyncIterableIterator<[string, { ctrl?: boolean; name?: string }]>) {
      if (key.name === 'return') return drives[selected] ?? drives[0]
      if (key.name === 'escape' || (key.ctrl === true && key.name === 'c')) break
      if (key.name === 'up' || key.name === 'down') {
        selected = moveSelection(drives, selected, key.name === 'up' ? -1 : 1)
        const lines = renderDriveList(drives, selected).map(line => `${clearLine}${line}`)
        process.stdout.write(`${cursorUp(drives.length)}${lines.join('\n')}\n`)
      }
    }
  } finally {
    process.stdin.setRawMode(false)
    process.stdin.pause()
    process.stdout.write(showCursor)
  }
  throw new Error('No drive selected')
}

/**
 * Ask the user which drive to benchmark, with the arrow keys in a terminal or by typing its number otherwise
 * @param drives the drives to choose from
 * @returns the selected drive
 */
async function askDrive(drives: readonly Drive[]) {
  if (process.stdin.isTTY) {
    const drive = await pickDriveWithArrows(drives)
    if (drive !== undefined) return drive
  }
  logger.info('Available drives :')
  for (const [index, drive] of drives.entries()) {
    const number = bold(String(index + 1))
    process.stdout.write(`${describeDrive(drive, `${number}.`)}\n`)
  }
  const question = 'Which drive do you want to benchmark ? '
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  // nothing is written yet, Ctrl+C simply ends the prompt
  prompt.on('SIGINT', () => {
    prompt.close()
  })
  process.stdout.write(question)
  try {
    // iterating lines instead of prompt.question() keeps the lines sent before we listen, like piped answers
    for await (const answer of prompt) {
      const choice = parseDriveChoice(answer, drives)
      if ('drive' in choice) return choice.drive
      logger.warn(choice.error)
      process.stdout.write(question)
    }
  } finally {
    prompt.close()
  }
  throw new Error('No drive selected')
}

/**
 * Find the drive hosting a folder given on the command line
 * @param folder the folder
 * @param drives the known drives
 * @returns the drive, using this folder as test folder
 */
function driveFromFolder(folder: string, drives: readonly Drive[]): Drive {
  const absolute = path.resolve(folder)
  const deviceId = statSync(absolute).dev
  const drive = drives.find(item => statSync(item.mountPoint).dev === deviceId)
  if (drive === undefined) throw new Error(`No drive found for ${absolute}`)
  return { ...drive, testFolder: isUsableFolder(absolute, deviceId) ? absolute : undefined }
}

/**
 * Show the progress of the running test on a single line
 * @param name the test name
 * @param percent the progress percent
 * @param speed the current speed in MB/s
 */
function showProgress(name: string, percent: number, speed: number) {
  process.stdout.write(`\r  ${name.padEnd(nameWidth)} ${String(percent).padStart(percentWidth)}% ${dim(formatSpeed(speed).padStart(speedWidth))}  `)
}

type FileOpener = (filePath: string, mode: 'create' | 'read') => OpenedFile

/**
 * Show a finished test result on the progress line
 * @param name the test name
 * @param value the result to show
 */
function showDone(name: string, value: string) {
  process.stdout.write(`${clearLine}  ${name.padEnd(nameWidth)} ${green(value)}\n`)
}

/**
 * Remove a file if it exists, only used on files created by the benchmark
 * @param filePath the file path
 */
function removeCreatedFile(filePath: string) {
  if (existsSync(filePath)) unlinkSync(filePath)
}

/**
 * Create the small files operations, in a new folder that is always deleted
 * @param folder the folder to create, it must not exist
 * @param openFile the direct I/O file opener, used to read the files without the OS cache
 * @returns the operations and a cleanup function
 */
function createSmallFilesOps(folder: string, openFile: FileOpener) {
  mkdirSync(folder)
  const filePath = (index: number) => path.join(folder, `${index}.tmp`)
  const written: string[] = []
  const ops: SmallFilesOps = {
    read: (index, buffer, length) => {
      const file = openFile(filePath(index), 'read')
      try {
        file.read(buffer, length, 0)
      } finally {
        file.close()
      }
    },
    syncAll: () => {
      for (const item of written) {
        const fd = openSync(item, 'r+')
        fsyncSync(fd)
        closeSync(fd)
      }
      if (isWindows) return
      const folderFd = openSync(folder, 'r')
      fsyncSync(folderFd)
      closeSync(folderFd)
    },
    write: (index, data) => {
      writeFileSync(filePath(index), data, { flag: 'wx' })
      written.push(filePath(index))
    },
  }
  // the folder was created by mkdirSync just above, it only contains files written by the benchmark
  const cleanup = () => {
    rmSync(folder, { force: true, recursive: true })
  }
  return { cleanup, ops }
}

type DirectIo = {
  getAddress: BunFfi['ptr']
  openFile: FileOpener
}

/**
 * Prepare the benchmark context and the aligned buffers
 * @param testFolder the folder hosting the test files
 * @param file the opened test file
 * @param io the direct I/O helpers
 * @returns the context, without its extra file yet, and the buffers
 */
function prepareBenchmark(testFolder: string, file: OpenedFile, io: DirectIo) {
  const config = defaultConfig
  const runId = randomInt(nbUint32Values)
  const context: BenchContext = { config, file, isAborted: () => isAborted, now: () => performance.now(), onProgress: showProgress, random: Math.random, runId }
  const bigBuffer = alignedBuffer(config.bigBlockSize, io.getAddress)
  randomFillSync(bigBuffer)
  const pool = alignedBuffer(config.randomPoolSize, io.getAddress)
  randomFillSync(pool)
  const readBuffer = alignedBuffer(config.bigBlockSize, io.getAddress)
  return { bigBuffer, context, pool, prefix: path.join(testFolder, `bench-drive-${runId}`), readBuffer }
}

/**
 * Run the small files test in a dedicated folder, always deleted
 * @param context the benchmark context
 * @param folder the folder to create
 * @param io the direct I/O helpers and the aligned buffers
 * @param io.openFile the direct I/O file opener
 * @param io.buffers the aligned buffers
 * @param io.buffers.buffer receives the reads
 * @param io.buffers.data filled with random data
 * @returns the small files result
 */
async function runSmallFilesTest(context: BenchContext, folder: string, io: { buffers: { buffer: Uint8Array; data: Uint8Array }; openFile: FileOpener }) {
  const { cleanup, ops } = createSmallFilesOps(folder, io.openFile)
  try {
    const small = await runSmallFiles(context, ops, io.buffers)
    showDone(testNames.smallFiles, `write ${small.smallFiles.writeRate.toFixed(0)} files/s, read ${small.smallFiles.readRate.toFixed(0)} files/s`)
    return small
  } finally {
    cleanup()
  }
}

/**
 * Run every test on the given test file
 * @param testFolder the folder hosting the test files
 * @param file the opened test file
 * @param io the direct I/O helpers
 * @returns the report
 */
async function runBenchmarks(testFolder: string, file: OpenedFile, io: DirectIo): Promise<BenchReport> {
  const { bigBuffer, context, pool, prefix, readBuffer } = prepareBenchmark(testFolder, file, io)
  const writes = await runSequentialWrite(context, bigBuffer)
  showDone(testNames.sequentialWrite, formatSpeed(writes.result.average))
  showDone(testNames.sustainedWrite, describeSustained(writes.sustained))
  const reads = await runSequentialRead(context, bigBuffer, readBuffer)
  showDone(testNames.sequentialRead, formatSpeed(reads.result.average))
  const randomWrite = await runRandomWrite(context, pool)
  showDone(testNames.randomWrite, formatSpeed(randomWrite.average))
  const randomRead = await runRandomRead(context, pool)
  showDone(testNames.randomRead, formatSpeed(randomRead.average))
  const small = await runSmallFilesTest(context, `${prefix}-files`, { buffers: { buffer: readBuffer, data: bigBuffer }, openFile: io.openFile })
  return {
    dataChecked: reads.nbBlocks + small.nbFiles,
    dataErrors: reads.dataErrors + small.dataErrors,
    results: [writes.result, reads.result, randomWrite, randomRead],
    smallFiles: small.smallFiles,
    sustained: writes.sustained,
  }
}

/**
 * Create the test file, run the benchmarks and always delete the test file
 * @param drive the drive to benchmark
 * @returns the report
 */
async function benchmark(drive: Drive) {
  if (drive.testFolder === undefined) throw new Error(`No writable folder found on ${drive.mountPoint}`)
  // re-check right before writing, the free space may have changed since the drive listing
  const { bavail, bsize } = statfsSync(drive.testFolder)
  if (!hasEnoughSpace(bavail * bsize)) throw new Error(`Not enough free space on ${drive.mountPoint}, ${formatBytes(defaultConfig.fileSize + defaultConfig.safetyMargin)} are needed`)
  const ffi = (await import(bunFfiModule)) as BunFfi
  const kernel32 = isWindows ? loadKernel32(ffi.dlopen) : undefined
  const openFile: FileOpener = (filePath, mode) => (kernel32 === undefined ? openLinuxFile(filePath, mode) : openWindowsFile(filePath, kernel32, mode))
  const filePath = path.join(drive.testFolder, `bench-drive-${Date.now()}.tmp`)
  logger.info(`Test file : ${blue(filePath)} (${formatBytes(defaultConfig.fileSize)}, deleted at the end)`)
  let file: OpenedFile | undefined = undefined
  try {
    file = openFile(filePath, 'create')
    return await runBenchmarks(drive.testFolder, file, { getAddress: ffi.ptr, openFile })
  } finally {
    file?.close()
    // only delete a file we created : the openers refuse to open an existing file
    if (file !== undefined) removeCreatedFile(filePath)
  }
}

/**
 * Explain the most common failures in human words
 * @param error the error thrown
 * @returns the message to show
 */
function explainError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('EINVAL')) return `${message}\nThis filesystem does not support direct I/O, results would be inflated by the OS cache so the benchmark is not run.`
  return message
}

/**
 * Find the physical disk behind a partition or a device-mapper volume like LVM
 * @param device the device, like "/dev/sda1" or "/dev/mapper/vg-root"
 * @returns the disk name, like "sda" or "nvme0n1"
 */
function physicalDisk(device: string): string {
  const name = path.basename(realpathSync(device))
  const sysPath = realpathSync(`/sys/class/block/${name}`)
  const slaves = existsSync(path.join(sysPath, 'slaves')) ? readdirSync(path.join(sysPath, 'slaves')) : []
  const [firstSlave] = slaves
  if (firstSlave !== undefined) return physicalDisk(`/dev/${firstSlave}`)
  if (existsSync(path.join(sysPath, 'partition'))) return path.basename(path.dirname(sysPath))
  return name
}

/**
 * Read a sysfs file, returning an empty string when it does not exist
 * @param filePath the file path
 * @returns the trimmed content
 */
function readSysFile(filePath: string) {
  try {
    return readFileSync(filePath, 'utf8').trim()
  } catch {
    return ''
  }
}

/**
 * Find the sysfs folder of the USB device hosting a disk
 * @param disk the disk name, like "sda"
 * @returns the USB device folder, or undefined if the disk is not on USB
 */
function usbDeviceFolder(disk: string) {
  let folder = realpathSync(`/sys/block/${disk}/device`)
  while (folder !== path.dirname(folder)) {
    if (existsSync(path.join(folder, 'version')) && existsSync(path.join(folder, 'speed'))) return folder
    folder = path.dirname(folder)
  }
  return undefined
}

/**
 * Find the USB version of a disk, it is the version of the current link : a USB 3 key in a USB 2 port says 2.1
 * @param disk the disk name, like "sda"
 * @returns the USB version, or undefined if not found
 */
function linuxUsbVersion(disk: string) {
  const folder = usbDeviceFolder(disk)
  return folder === undefined ? undefined : parseUsbVersion(readSysFile(path.join(folder, 'version')))
}

/**
 * Find the negotiated USB link speed of a disk
 * @param disk the disk name, like "sda"
 * @returns the speed in Mb/s, or undefined if not found
 */
function linuxUsbLinkSpeed(disk: string) {
  const folder = usbDeviceFolder(disk)
  const speed = folder === undefined ? Number.NaN : Number(readSysFile(path.join(folder, 'speed')))
  return Number.isNaN(speed) ? undefined : speed
}

/**
 * Check if a USB drive runs slower than it can
 * @param drive the drive
 * @returns the warning to show, or undefined if the link is fine or the drive is not on USB
 */
function linuxUsbLinkWarning(drive: Drive) {
  const folder = usbDeviceFolder(physicalDisk(drive.device))
  if (folder === undefined) return undefined
  const bosPath = path.join(folder, 'bos_descriptors')
  if (!existsSync(bosPath)) return undefined
  const linkSpeed = Number(readSysFile(path.join(folder, 'speed')))
  return usbLinkWarning(linkSpeed, usbMaxSpeedFromBos(readFileSync(bosPath)))
}

/**
 * Identify a drive on Linux with udev and sysfs
 * @param drive the drive
 * @returns the drive identity
 */
function linuxIdentity(drive: Drive): DriveIdentity {
  const disk = physicalDisk(drive.device)
  const properties = parseUdevProperties(execFileSync('udevadm', ['info', '--query=property', `--name=/dev/${disk}`], { encoding: 'utf8' }))
  const property = (key: string) => decodeUdevValue(properties.get(key) ?? '')
  const { brand, model } = splitBrandModel(property('ID_VENDOR_ENC'), property('ID_MODEL_ENC') || property('ID_MODEL'))
  let version: number | undefined = undefined
  let linkSpeed: number | undefined = undefined
  if (property('ID_BUS') === 'usb') {
    version = linuxUsbVersion(disk)
    linkSpeed = linuxUsbLinkSpeed(disk)
  } else if (disk.startsWith('nvme')) version = pcieGeneration(readSysFile(`/sys/block/${disk}/device/device/current_link_speed`))
  const sizeBytes = Number(readSysFile(`/sys/block/${disk}/size`)) * linuxSectorSize
  const type = readSysFile(`/sys/block/${disk}/removable`) === '1' ? 'Key' : 'Drive'
  return { brand, fileSystem: drive.fsType, linkSpeed, model, serial: property('ID_SERIAL_SHORT'), sizeBytes, type, version }
}

/**
 * Identify a drive on Windows with PowerShell, the USB version and PCIe generation are not available there
 * @param drive the drive
 * @returns the drive identity
 */
function windowsIdentity(drive: Drive): DriveIdentity {
  const letter = drive.device.replace(':', '')
  const script = `$disk = Get-Partition -DriveLetter ${letter} | Get-Disk
$volume = Get-Volume -DriveLetter ${letter}
$logical = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${letter}:'"
[pscustomobject]@{ driveType = $logical.DriveType; fileSystem = [string]$volume.FileSystemType; manufacturer = [string]$disk.Manufacturer; model = [string]$disk.FriendlyName; serial = [string]$disk.SerialNumber; size = $disk.Size } | ConvertTo-Json -Compress`
  const output = execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' })
  const data = JSON.parse(output) as { driveType: number; fileSystem: string; manufacturer: string; model: string; serial: string; size: number }
  const { brand, model } = splitBrandModel(data.manufacturer.trim(), data.model)
  return { brand, fileSystem: data.fileSystem, linkSpeed: undefined, model, serial: data.serial.trim(), sizeBytes: data.size, type: data.driveType === windowsRemovableDriveType ? 'Key' : 'Drive', version: undefined }
}

/**
 * Ask a yes/no question, a closed input means no
 * @param question the question
 * @param isYesByDefault the result of an empty answer
 * @returns true if the user accepted
 */
async function askYesNo(question: string, isYesByDefault = true) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  prompt.on('SIGINT', () => {
    prompt.close()
  })
  process.stdout.write(`${question} ${dim(isYesByDefault ? '[Y/n]' : '[y/N]')} `)
  try {
    const { done, value } = await prompt[Symbol.asyncIterator]().next()
    return done !== true && isYes(value, isYesByDefault)
  } finally {
    prompt.close()
  }
}

/**
 * Offer to copy the results as a spreadsheet row to the clipboard
 * @param drive the benchmarked drive
 * @param report the benchmark report
 */
async function offerSpreadsheetCopy(drive: Drive, report: BenchReport) {
  if (!(await askYesNo('Copy the results to the clipboard, to paste them in the spreadsheet column C ?'))) return
  const identity = isWindows ? windowsIdentity(drive) : linuxIdentity(drive)
  const osName = isWindows ? windowsName(release()) : linuxName(readSysFile('/etc/os-release'))
  const row = spreadsheetRow(identity, osName, report)
  await clipboard.write(row)
  logger.success(`Copied to the clipboard : ${row.replaceAll('\t', dim(' | '))}`)
}

/**
 * Ask the running benchmark to stop, it will delete the test file before exiting
 */
function abortBenchmark() {
  isAborted = true
}

/**
 * Start the cli
 */
async function start() {
  logger.info('Drive benchmark : sequential and random reads & writes, existing data is never touched')
  if (process.platform !== 'linux' && !isWindows) throw new Error(`Unsupported platform "${process.platform}", only Linux and Windows are supported`)
  if (process.versions.bun === undefined) throw new Error('This cli needs Bun to bypass the OS cache, run it with : bun src/bench-drive.cli.ts')
  const drives = listDrives()
  if (drives.length === 0) throw new Error('No drive found')
  const folderArgument = process.argv.at(firstArgumentIndex)
  const drive = folderArgument === undefined ? await askDrive(drives) : driveFromFolder(folderArgument, drives)
  const linkWarning = isWindows ? undefined : linuxUsbLinkWarning(drive)
  if (linkWarning !== undefined) {
    logger.warn(linkWarning)
    if (!(await askYesNo('Continue anyway ?', false))) {
      logger.info('Benchmark cancelled, nothing was written')
      return
    }
  }
  // from now on Ctrl+C, a kill or closing the terminal stops the benchmark gracefully so the test file is always deleted
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(signal, abortBenchmark)
  logger.info(`Benchmarking ${blue(drive.mountPoint)}, it takes around a minute on slow drives, Ctrl+C to stop`)
  const report = await benchmark(drive)
  process.stdout.write(`\n${formatResults(report.results).join('\n')}\n\n${formatReportDetails(report).join('\n')}\n\n`)
  if (report.dataErrors > 0) logger.error(describeDataCheck(report))
  logger.success(`Benchmark done on ${drive.mountPoint}, test files deleted`)
  await offerSpreadsheetCopy(drive, report)
}

/* v8 ignore stop */

// avoid running this script if it's imported for testing
/* v8 ignore if */
if (process.argv[1]?.includes('bench-drive.cli.ts'))
  try {
    await start()
  } catch (error) {
    process.stdout.write('\n')
    logger.error(explainError(error))
    process.exitCode = 1
  }
