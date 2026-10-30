#!/usr/bin/env bun
// oxlint-disable max-lines
import { execFile } from 'node:child_process'
import { createSocket } from 'node:dgram'
import { promises as dns } from 'node:dns'
import { once } from 'node:events'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { homedir, hostname, type NetworkInterfaceInfo, networkInterfaces } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { emitKeypressEvents } from 'node:readline'
import { parseArgs, promisify } from 'node:util'
import { invariant, kebabCase } from 'es-toolkit'
import { bold, dim, green, Logger, sleep, yellow } from 'shuutils'

// Scan every active network connection (wifi, ethernet...) and list the living devices, like SoftPerfect Network Scanner does.
// The devices you named are stored in a text file, one device per line : MAC=name (vendor), new devices are shown in green and unknown ones (name or vendor not found, ???) in yellow.
// use me like :
//  bun ~/Projects/github/snippets/src/net-scan.cli.ts                 # scan continuously, notify when a device appears, use ./net-scan.txt
//  bun ~/Projects/github/snippets/src/net-scan.cli.ts my-devices.txt  # use another storage file
//  bun ~/Projects/github/snippets/src/net-scan.cli.ts --once          # scan once, print the report and leave
//  bun ~/Projects/github/snippets/src/net-scan.cli.ts --help          # show the options
//  bun ~/Projects/github/snippets/src/net-scan.cli.ts --hints         # start with the hints column shown, h toggles it
//  bun ~/Projects/github/snippets/src/net-scan.cli.ts --network       # start with the network column shown, n toggles it
// keys : up / down to select a device, enter to rename it, enter to save, escape to cancel, l to turn the live mode on or off, h to show or hide the hints, n to show or hide the network, q to quit

/** where a name comes from : reverse DNS, the hostname of this machine, mDNS or NetBIOS */
export type NameSource = 'dns' | 'hostname' | 'mdns' | 'netbios'

/** what the TCP ports of a device answered, searched once per device because it rarely changes */
export type PortScan = {
  /** services accepting the connection */
  open: string[]
}

/** a device seen on a network */
export type FoundDevice = {
  interfaceNames: string[]
  ip: string
  mac: string
  name?: string
  /** every name found, by source, the best one is the name */
  names?: Partial<Record<NameSource, string>>
  ports?: PortScan
  /** duration of a TCP connection attempt in milliseconds, undefined if the device does not answer */
  responseMs?: number
}

/** a device tracked across sweeps */
export type TrackedDevice = FoundDevice & {
  /** true for a device that was not there at the first scan */
  appearedLater: boolean
  lastNotifiedAt?: number
  /** consecutive sweeps where the device was not seen */
  missed: number
  online: boolean
  /** true if the last sweep saw the device */
  present: boolean
}

/** a subnet to scan, reachable through one or several network interfaces */
export type ScanTarget = {
  hosts: string[]
  interfaceNames: string[]
  own: { ip: string; mac: string }[]
}

/** the keyboard key as parsed by node:readline */
export type Key = { ctrl?: boolean; name?: string; sequence?: string }

export type EditState = { cursor: number; text: string }

export type Ui = { edit?: EditState; selectedMac?: string }

export type KeyResult = { quit?: true; save?: { label: string; mac: string }; toggleHints?: true; toggleLive?: true; toggleNetwork?: true; ui: Ui }

/** what the cli is doing : a ratio between 0 and 1 draws a progress bar */
export type Progress = { label: string; ratio?: number }

/** what the keys and the report need to know about the devices */
export type View = {
  devices: readonly TrackedDevice[]
  /** terminal height in rows, every row is shown if unknown */
  height?: number
  isKnown: (device: FoundDevice) => boolean
  isLive?: boolean
  labelOf: (device: FoundDevice) => string
  progress?: Progress
  /** true to show the hints column */
  showHints?: boolean
  /** true to show the network column */
  showNetwork?: boolean
  ui: Ui
  /** gives the vendor found in the MAC database */
  vendorOf?: (device: FoundDevice) => string | undefined
  /** terminal width in columns, 80 if unknown */
  width?: number
}

export const config = {
  /** a device is considered offline after this number of sweeps without seeing it */
  maxMissedSweeps: 3,
  /** more new devices than this in one sweep are announced in a single notification */
  maxNotifications: 3,
  /** the biggest subnet scanned is a /22, 1022 hosts */
  maxSubnetBits: 22,
  /** longest text accepted for a device name */
  maxTextLength: 80,
  /** a device is notified again only after this duration, to ignore flapping devices : 10 minutes */
  notifyCooldownMs: 600_000,
  /** how long the vendors list stays valid : 30 days */
  ouiMaxAgeMs: 2_592_000_000,
  ouiUrl: 'https://standards-oui.ieee.org/oui/oui.csv',
  /** duration between the end of a sweep and the start of the next one */
  sweepIntervalMs: 30_000,
}

const unknown = '???'
const macLength = 12
const ouiLength = 6
const ipBits = 32
const byteRange = 256
const byteBitsMask = 0xc0
const virtualInterfaceRegex = /^(?:docker|veth|br-|virbr|tun|tap|tailscale|zt|wg|vmnet|vboxnet|lo$)|vethernet|vmware|virtualbox|hyper-v|loopback|tailscale/iu
const keyEscape = '\u001B'
const byteBase = 2
const firstByteLength = 2
const firstArgumentIndex = 2
const ipOctets = 4
const pointerSize = 2
const maxDnsJumps = 16
const dnsHeaderLength = 12
const dnsQuestionCount = 4
const dnsAnswerCount = 6
const dnsTypeOffset = 0
const dnsDataLengthOffset = 8
const dnsDataStartOffset = 10
const dnsQuestionFooter = 4
const dnsTypePtr = 12
const dnsClassUnicastInternet = 0x80_01
const nbstatType = 0x21
const nbstatWildcardLength = 30
const nbstatCountOffset = 10
const nbstatEntriesOffset = 11
const nbstatEntrySize = 18
const nbstatNameLength = 15
const nbstatFlagsOffset = 16
const nbstatGroupFlag = 0x80_00
const nbstatPort = 137
const mdnsPort = 5353
const sendBatchSize = 128
const sendPauseMs = 10
const nbstatWaitMs = 1500
const mdnsWaitMs = 600
const dnsWaitMs = 1500
const commandTimeoutMs = 5000
const downloadTimeoutMs = 30_000
const responseTimeoutMs = 1000
/** web, ssh and file sharing ports : a device accepts or refuses the connection, both are answers */
const responsePorts = { airplay: 7000, cast: 8008, dns: 53, http: 80, httpAlt: 8080, https: 443, iosSync: 62_078, mediaServer: 9000, mqtt: 1883, nasWeb: 5001, rtsp: 554, samsungTv: 8001, smb: 445, ssh: 22, upnp: 5000, webos: 3000 }
/** a closed UDP port makes the device answer with an ICMP error, which is an answer too */
const closedUdpPort = 33_434
const retryDelayMs = 300
/** a new device opens about 34 sockets to be probed, so 24 devices at once stay under the usual 1024 file descriptors limit */
const identifyConcurrency = 24
const progressWidth = 20
const legendIndent = 2
const legendMinGap = 2
const defaultWidth = 80
/** share of a sweep already done when the addresses were asked, then when the neighbors are listed */
const sweepSteps = { listed: 0.6, probed: 0.4 }
const percentMax = 100
const msInSecond = 1000
const columnGap = '  '
/** the "> " marker in front of the selected row */
const selectionMarkerLength = 2
/** the name column is never shrunk below this width, even in a narrow terminal */
const minNameLength = 12
/** the cursor of a long name being edited leaves this share of the width to what follows it */
const cursorTailShare = 3
const wideWidth = 2
const middleDivisor = 2
/** lines of the report around the rows : title, headers, progress, legend, the blanks and the last line break */
const reportChromeLines = 10

/**
 * Remove control characters and ANSI escapes, trim and cap the length of a text coming from the network or a file
 * @param text the raw text
 * @returns the safe text
 */
export function sanitizeText(text: string) {
  return text
    .replaceAll(/\p{Cc}/gu, '')
    .trim()
    .slice(0, config.maxTextLength)
}

/**
 * Normalize a MAC address like aa:bb:cc:dd:ee:ff or AA-BB-CC-DD-EE-FF
 * @param raw the raw MAC address
 * @returns 12 uppercase hexadecimal chars, or undefined if it is not a MAC address
 */
export function normalizeMac(raw: string) {
  const mac = raw.replaceAll(/[\s.:-]/gu, '').toUpperCase()
  return mac.length === macLength && /^[\dA-F]+$/u.test(mac) ? mac : undefined
}

/**
 * Tell if a MAC address is randomized, like the private addresses of phones
 * @param mac the normalized MAC address
 * @returns true if the locally administered bit is set
 */
export function isLocallyAdministered(mac: string) {
  return Math.floor(Number.parseInt(mac.slice(0, firstByteLength), 16) / byteBase) % byteBase === 1
}

/**
 * Tell if a MAC address cannot be a device : multicast or broadcast
 * @param mac the normalized MAC address
 * @returns true if it should be ignored
 */
function isGroupMac(mac: string) {
  return Number.parseInt(mac.slice(0, firstByteLength), 16) % byteBase === 1 || mac === '000000000000'
}

/**
 * Build the label shown and stored for a device
 * @param name the name found on the network
 * @param vendor the vendor found in the MAC database
 * @returns a label like "Steam Link (Valve Corporation)", "??? (Valve Corporation)" or "??? (???)"
 */
export function buildLabel(name: string | undefined, vendor: string | undefined) {
  return `${name === undefined || name === '' ? unknown : name} (${vendor === undefined || vendor === '' ? unknown : vendor})`
}

/**
 * Read the MAC address at the start of a MAC=label line
 * @param line the line
 * @returns the normalized MAC address, undefined for comments and malformed lines
 */
function macOfLine(line: string) {
  const separator = line.indexOf('=')
  return separator === -1 ? undefined : normalizeMac(line.slice(0, separator))
}

/**
 * Read the storage file content
 * @param content the text file content
 * @returns the label of each MAC address, the last line wins if a MAC is duplicated
 */
export function readLabels(content: string) {
  const labels = new Map<string, string>()
  for (const line of content.replace('\uFEFF', '').split(/\r?\n/u)) {
    const mac = macOfLine(line)
    if (mac !== undefined) labels.set(mac, line.slice(line.indexOf('=') + 1).trim())
  }
  return labels
}

/**
 * Change the label of one device in the storage file content, every other line is kept as is
 * @param content the current text file content
 * @param mac the normalized MAC address
 * @param label the new label
 * @returns the new text file content
 */
export function updateStoreContent(content: string, mac: string, label: string) {
  const bom = content.startsWith('\uFEFF') ? '\uFEFF' : ''
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.replace('\uFEFF', '').split(/\r?\n/u)
  if (lines.at(-1) === '') lines.pop()
  const newLine = `${mac}=${label}`
  const index = lines.findLastIndex(line => macOfLine(line) === mac)
  if (index === -1) lines.push(newLine)
  else lines[index] = newLine
  return `${bom}${lines.join(eol)}${eol}`
}

/**
 * Make sure the storage file exists
 * @param file the storage file
 * @returns true if the file already existed
 */
export function ensureStore(file: string) {
  const existed = existsSync(file)
  if (!existed) writeFileSync(file, '')
  return existed
}

/**
 * Replace a file with a new content : a temporary file is written then renamed over it, so a crash never leaves half a file.
 * It also works on network shares like smb mounts, which refuse to open an existing file for writing, and not copyFileSync either.
 * @param file the file to replace
 * @param content the new content
 */
function replaceFile(file: string, content: Buffer | string) {
  const temporaryFile = `${file}.tmp`
  try {
    writeFileSync(temporaryFile, content)
    renameSync(temporaryFile, file)
  } catch {
    // some file systems refuse the rename, the file is then written in place
    rmSync(temporaryFile, { force: true, recursive: true })
    writeFileSync(file, content)
  }
}

/**
 * Save the label of a device : the first save of a run backs up the previous file in a .bak, then the file is replaced atomically
 * @param file the storage file
 * @param entry the device to save
 * @param entry.label the new label
 * @param entry.mac the normalized MAC address
 * @param session the state shared by the saves of one run
 * @param session.backedUp true once the .bak is done, or when there was nothing to back up
 */
export function saveLabel(file: string, entry: { label: string; mac: string }, session: { backedUp: boolean }) {
  if (!session.backedUp) {
    replaceFile(`${file}.bak`, readFileSync(file))
    session.backedUp = true
  }
  replaceFile(file, updateStoreContent(readFileSync(file, 'utf8'), entry.mac, entry.label))
}

/**
 * Convert an IPv4 address to a number
 * @param ip the address like 192.168.1.2
 * @returns the number
 */
export function ipToInt(ip: string) {
  return ip.split('.').reduce((total, part) => total * byteRange + Number(part), 0)
}

/**
 * Convert a number to an IPv4 address
 * @param value the number
 * @returns the address like 192.168.1.2
 */
export function intToIp(value: number) {
  const octets: number[] = []
  let rest = value
  for (let index = 0; index < ipOctets; index += 1) {
    octets.unshift(rest % byteRange)
    rest = Math.floor(rest / byteRange)
  }
  return octets.join('.')
}

/**
 * List the hosts of a subnet, a subnet bigger than a /22 is reduced to the /22 containing the address
 * @param ip the address of the machine in this subnet
 * @param netmask the netmask like 255.255.255.0
 * @returns every host address, network and broadcast addresses excluded
 */
export function subnetHosts(ip: string, netmask: string) {
  const prefix = netmask.split('.').reduce((total, part) => total + Number(part).toString(byteBase).replaceAll('0', '').length, 0)
  const bits = Math.max(prefix, config.maxSubnetBits)
  if (bits >= ipBits - 1) return []
  const count = byteBase ** (ipBits - bits)
  const network = Math.floor(ipToInt(ip) / count) * count
  return Array.from({ length: count - pointerSize }, (_unused, index) => intToIp(network + index + 1))
}

/**
 * Pick the real active networks of this machine, virtual interfaces are ignored
 * @param interfaces the network interfaces as given by node:os
 * @returns one target per subnet, a subnet shared by several interfaces is scanned once
 */
export function pickTargets(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>) {
  const targets = new Map<string, ScanTarget>()
  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    if (virtualInterfaceRegex.test(interfaceName)) continue
    for (const address of addresses ?? []) {
      const mac = normalizeMac(address.mac)
      if (address.family !== 'IPv4' || address.internal || address.address.startsWith('169.254.') || mac === undefined || mac === '000000000000') continue
      const hosts = subnetHosts(address.address, address.netmask)
      const [key] = hosts
      if (key === undefined) continue
      const target = targets.get(key) ?? { hosts, interfaceNames: [], own: [] }
      if (!target.interfaceNames.includes(interfaceName)) target.interfaceNames.push(interfaceName)
      target.own.push({ ip: address.address, mac })
      targets.set(key, target)
    }
  }
  return [...targets.values()]
}

/**
 * Read the output of "ip -4 neigh show"
 * @param output the command output
 * @returns the neighbors having a known MAC address
 */
export function parseIpNeigh(output: string) {
  const neighbors: { ip: string; mac: string }[] = []
  for (const line of output.split('\n')) {
    const match = /^(?<ip>\d+\.\d+\.\d+\.\d+) .*lladdr (?<mac>[\da-f:]+)/iu.exec(line)
    const mac = normalizeMac(match?.groups?.mac ?? '')
    if (match?.groups?.ip !== undefined && mac !== undefined && !/\b(?:FAILED|INCOMPLETE)\b/u.test(line)) neighbors.push({ ip: match.groups.ip, mac })
  }
  return neighbors
}

/**
 * Read the content of /proc/net/arp
 * @param content the file content
 * @returns the neighbors having a complete entry
 */
export function parseProcNetArp(content: string) {
  const neighbors: { ip: string; mac: string }[] = []
  for (const line of content.split('\n').slice(1)) {
    const [ip, , flags, rawMac] = line.trim().split(/\s+/u)
    const mac = normalizeMac(rawMac ?? '')
    if (ip !== undefined && flags === '0x2' && mac !== undefined) neighbors.push({ ip, mac })
  }
  return neighbors
}

/**
 * Read the output of "arp -a" on Windows
 * @param output the command output
 * @returns the neighbors, multicast and broadcast addresses excluded
 */
export function parseArpA(output: string) {
  const neighbors: { ip: string; mac: string }[] = []
  for (const line of output.split(/\r?\n/u)) {
    const match = /^\s*(?<ip>\d+\.\d+\.\d+\.\d+)\s+(?<mac>[\da-f]{2}(?:-[\da-f]{2}){5})\s+dynamic/iu.exec(line)
    const mac = normalizeMac(match?.groups?.mac ?? '')
    if (match?.groups?.ip !== undefined && mac !== undefined && !isGroupMac(mac)) neighbors.push({ ip: match.groups.ip, mac })
  }
  return neighbors
}

/**
 * Split a CSV line, the quoted fields can contain commas
 * @param line the line
 * @returns the fields
 */
function splitCsvLine(line: string) {
  return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/u).map(field => field.trim().replaceAll(/^"|"$/gu, '').replaceAll('""', '"'))
}

/**
 * Read the IEEE oui.csv file
 * @param csv the file content
 * @returns the vendor of each 6 chars prefix
 */
export function parseOui(csv: string) {
  const vendors = new Map<string, string>()
  for (const line of csv.split(/\r?\n/u)) {
    const [, prefix = '', vendor = ''] = splitCsvLine(line)
    if (prefix.length === ouiLength && vendor !== '' && /^[\dA-F]+$/u.test(prefix)) vendors.set(prefix, vendor)
  }
  return vendors
}

/**
 * Find the vendor of a MAC address
 * @param vendors the vendors by prefix
 * @param mac the normalized MAC address
 * @returns the vendor, if known
 */
export function lookupVendor(vendors: ReadonlyMap<string, string>, mac: string) {
  return vendors.get(mac.slice(0, ouiLength))
}

/**
 * Tell if the vendors file should be downloaded again
 * @param modifiedAtMs the file modification time, undefined if there is no file
 * @param nowMs the current time
 * @returns true if the file is missing or too old
 */
export function isOuiStale(modifiedAtMs: number | undefined, nowMs: number) {
  return modifiedAtMs === undefined || nowMs - modifiedAtMs > config.ouiMaxAgeMs
}

/**
 * Build a DNS query
 * @param name the name to ask
 * @param type the record type
 * @param classCode the class
 * @returns the packet
 */
export function buildDnsQuery(name: string, type: number, classCode: number) {
  const labels = name.split('.').map(label => Buffer.concat([Buffer.from([label.length]), Buffer.from(label)]))
  const header = Buffer.alloc(dnsHeaderLength)
  header.writeUInt16BE(1, dnsQuestionCount)
  const footer = Buffer.alloc(dnsQuestionFooter + 1)
  footer.writeUInt16BE(type, 1)
  footer.writeUInt16BE(classCode, dnsQuestionFooter - 1)
  return Buffer.concat([header, ...labels, footer])
}

/**
 * Build the mDNS question asking the name of an IP address
 * @param ip the address
 * @returns the packet, the unicast bit is set so the device answers us directly
 */
export function buildMdnsQuery(ip: string) {
  return buildDnsQuery(`${ip.split('.').toReversed().join('.')}.in-addr.arpa`, dnsTypePtr, dnsClassUnicastInternet)
}

/**
 * Build the NetBIOS node status question
 * @returns the packet
 */
export function buildNbstatQuery() {
  const header = Buffer.alloc(dnsHeaderLength)
  header.writeUInt16BE(1, dnsQuestionCount)
  const name = Buffer.from(` CK${'A'.repeat(nbstatWildcardLength)}\u0000`, 'latin1')
  const footer = Buffer.alloc(dnsQuestionFooter)
  footer.writeUInt16BE(nbstatType, 0)
  footer.writeUInt16BE(1, pointerSize)
  return Buffer.concat([header, name, footer])
}

/**
 * Read a DNS name, following compression pointers
 * @param buffer the packet
 * @param start where the name starts
 * @returns the name and the offset following it
 */
function readDnsName(buffer: Buffer, start: number) {
  const labels: string[] = []
  let offset = start
  let next = 0
  let hasJumped = false
  for (let jumps = 0; jumps <= maxDnsJumps; jumps += 1) {
    const length = buffer.readUInt8(offset)
    if (length === 0) return { name: labels.join('.'), next: hasJumped ? next : offset + 1 }
    if (length >= byteBitsMask) {
      if (!hasJumped) next = offset + pointerSize
      hasJumped = true
      offset = (length - byteBitsMask) * byteRange + buffer.readUInt8(offset + 1)
    } else {
      labels.push(buffer.toString('latin1', offset + 1, offset + 1 + length))
      offset += length + 1
    }
  }
  throw new Error('Too many DNS compression jumps')
}

/**
 * Read the host name of an mDNS answer
 * @param buffer the packet
 * @returns the name without .local, undefined if there is no PTR answer
 */
export function parseMdnsAnswer(buffer: Buffer) {
  try {
    let offset = dnsHeaderLength
    for (let index = 0; index < buffer.readUInt16BE(dnsQuestionCount); index += 1) offset = readDnsName(buffer, offset).next + dnsQuestionFooter
    for (let index = 0; index < buffer.readUInt16BE(dnsAnswerCount); index += 1) {
      const record = readDnsName(buffer, offset)
      const type = buffer.readUInt16BE(record.next + dnsTypeOffset)
      const dataStart = record.next + dnsDataStartOffset
      if (type === dnsTypePtr) return sanitizeText(readDnsName(buffer, dataStart).name.replace(/\.local$/iu, '')) || undefined
      offset = dataStart + buffer.readUInt16BE(record.next + dnsDataLengthOffset)
    }
  } catch {
    // a malformed packet is just a missing name
  }
  return undefined
}

/**
 * Read the computer name of a NetBIOS node status answer
 * @param buffer the packet
 * @returns the name, undefined if there is none
 */
export function parseNbstatAnswer(buffer: Buffer) {
  try {
    const answer = readDnsName(buffer, dnsHeaderLength)
    const count = buffer.readUInt8(answer.next + nbstatCountOffset)
    for (let index = 0; index < count; index += 1) {
      const start = answer.next + nbstatEntriesOffset + index * nbstatEntrySize
      const isGroup = buffer.readUInt16BE(start + nbstatFlagsOffset) >= nbstatGroupFlag
      if (buffer.readUInt8(start + nbstatNameLength) === 0 && !isGroup) return sanitizeText(buffer.toString('latin1', start, start + nbstatNameLength)) || undefined
    }
  } catch {
    // a malformed packet is just a missing name
  }
  return undefined
}

/**
 * Format a response time for the report
 * @param responseMs the duration in milliseconds
 * @returns a rounded text like "34 ms", "-" if unknown
 */
export function formatResponseTime(responseMs: number | undefined) {
  if (responseMs === undefined) return '-'
  return `${Math.round(responseMs)} ms`
}

/**
 * Pick the best name, the mDNS one is the most reliable
 * @param names every name found by source
 * @returns the best name, undefined if there is none
 */
export function bestName(names: FoundDevice['names']) {
  return names?.mdns ?? names?.netbios ?? names?.dns ?? names?.hostname
}

/**
 * Concatenate everything collected on a device that the other columns do not show : vendor and names not in the label, ports, and tracking
 * @param device the device
 * @param context what the table already shows
 * @param context.label the name column text
 * @param context.vendor the vendor found in the MAC database
 * @returns the hints like "mdns: Phone | open: ssh, https | random mac", "-" if there is nothing to tell
 */
export function buildHints(device: FoundDevice & { appearedLater?: boolean; missed?: number }, context: { label: string; vendor?: string }) {
  const { ports } = device
  const label = context.label.toLowerCase()
  const names = Object.entries(device.names ?? {}).flatMap(([source, name]) => (name === undefined || label.includes(name.toLowerCase()) ? [] : [`${source}: ${name}`]))
  const hints = [
    context.vendor === undefined || label.includes(context.vendor.toLowerCase()) ? '' : `vendor: ${context.vendor}`,
    ...names,
    ports === undefined || ports.open.length === 0 ? '' : `open: ${ports.open.join(', ')}`,
    isLocallyAdministered(device.mac) ? 'random mac' : '',
    device.missed === undefined || device.missed === 0 ? '' : `missed: ${device.missed}`,
    device.appearedLater === true ? 'appeared later' : '',
  ].filter(hint => hint !== '')
  return hints.length === 0 ? '-' : hints.join(' | ')
}

/**
 * Track the devices seen by a sweep
 * @param previous the devices known before this sweep
 * @param found the devices seen by this sweep
 * @param options the sweep options
 * @param options.baseline true for the first sweep, nothing is announced
 * @param options.nowMs the current time
 * @returns the updated devices, and the ones that just appeared
 */
export function applySweep(previous: ReadonlyMap<string, TrackedDevice>, found: readonly FoundDevice[], options: { baseline: boolean; nowMs: number }) {
  const devices = new Map<string, TrackedDevice>()
  const appeared: TrackedDevice[] = []
  for (const item of found) {
    const before = previous.get(item.mac)
    let { lastNotifiedAt } = before ?? {}
    const cooledDown = lastNotifiedAt === undefined || options.nowMs - lastNotifiedAt >= config.notifyCooldownMs
    const hasAppeared = before?.online !== true && !options.baseline && cooledDown
    if (hasAppeared) lastNotifiedAt = options.nowMs
    const device: TrackedDevice = {
      ...before,
      ...item,
      appearedLater: before?.appearedLater ?? !options.baseline,
      lastNotifiedAt,
      missed: 0,
      name: item.name ?? before?.name,
      names: item.names ?? before?.names,
      online: true,
      ports: item.ports ?? before?.ports,
      present: true,
      responseMs: item.responseMs,
    }
    devices.set(item.mac, device)
    if (hasAppeared) appeared.push(device)
  }
  for (const [mac, before] of previous) {
    if (devices.has(mac)) continue
    const missed = before.missed + 1
    devices.set(mac, { ...before, missed, online: before.online && missed < config.maxMissedSweeps, present: false, responseMs: undefined })
  }
  return { appeared, devices }
}

/**
 * Compare two devices by IP address
 * @param first the first device
 * @param second the second device
 * @returns the sort order
 */
export function compareByIp(first: FoundDevice, second: FoundDevice) {
  return ipToInt(first.ip) - ipToInt(second.ip)
}

/**
 * Describe the devices that just appeared
 * @param devices the new devices
 * @param labelOf gives the label of a device
 * @returns the notification text
 */
export function describeAppeared(devices: readonly FoundDevice[], labelOf: (device: FoundDevice) => string) {
  if (devices.length > config.maxNotifications) return { body: devices.map(device => device.ip).join(', '), title: `${devices.length} new devices on the network` }
  return { body: devices.map(device => `${device.ip} ${labelOf(device)}`).join('\n'), title: 'New device on the network' }
}

/**
 * Build the commands showing a desktop notification, the text is only given as arguments, never to a shell
 * @param context where the cli runs
 * @param context.environment the environment variables
 * @param context.platform the platform
 * @param message the notification
 * @param message.body the notification text
 * @param message.title the notification title
 * @returns the commands to run, empty if there is no desktop
 */
export function buildNotificationCommands(context: { environment: NodeJS.ProcessEnv; platform: string }, message: { body: string; title: string }) {
  if (context.platform !== 'linux' || (context.environment.DISPLAY === undefined && context.environment.WAYLAND_DISPLAY === undefined)) return []
  return [{ args: ['--app-name=net-scan', '--', sanitizeText(message.title), message.body.replaceAll(/\p{Cc}/gu, ' ').trim()], command: 'notify-send' }]
}

/**
 * Handle a key
 * @param view the devices and the ui
 * @param key the pressed key
 * @returns the new ui, and what to do
 */
export function handleKey(view: View, key: Key): KeyResult {
  if (key.ctrl === true && key.name === 'c') return { quit: true, ui: view.ui }
  if (view.ui.edit === undefined) return handleBrowseKey(view, key)
  return handleEditKey(view, view.ui.edit, key)
}

/**
 * Handle a key while browsing the devices
 * @param view the devices and the ui
 * @param key the pressed key
 * @returns the new ui, and what to do
 */
function handleBrowseKey(view: View, key: Key): KeyResult {
  const { devices, ui } = view
  const { length } = devices
  const index = devices.findIndex(device => device.mac === ui.selectedMac)
  if (key.name === 'q') return { quit: true, ui }
  if (key.name === 'l') return { toggleLive: true, ui }
  if (key.name === 'h') return { toggleHints: true, ui }
  if (key.name === 'n') return { toggleNetwork: true, ui }
  if ((key.name === 'down' || key.name === 'up') && length > 0) {
    const step = key.name === 'down' ? 1 : -1
    const next = index === -1 ? 0 : (index + step + length) % length
    return { ui: { selectedMac: devices[next]?.mac } }
  }
  const selected = devices[index]
  if (key.name === 'return' && selected !== undefined) {
    const text = view.labelOf(selected)
    return { ui: { edit: { cursor: text.length, text }, selectedMac: selected.mac } }
  }
  return { ui }
}

/**
 * Handle a key while editing a name
 * @param view the devices and the ui
 * @param edit the text being edited
 * @param key the pressed key
 * @returns the new ui, and what to do
 */
function handleEditKey(view: View, edit: EditState, key: Key): KeyResult {
  const { ui } = view
  const stop = { ui: { selectedMac: ui.selectedMac } }
  const selected = view.devices.find(device => device.mac === ui.selectedMac)
  if (key.name === 'escape' || selected === undefined) return stop
  if (key.name === 'return') {
    const label = sanitizeText(edit.text)
    return label === '' ? stop : { save: { label, mac: selected.mac }, ...stop }
  }
  const { cursor, text } = edit
  const update = (next: EditState): KeyResult => ({ ui: { ...ui, edit: next } })
  if (key.name === 'left') return update({ cursor: Math.max(cursor - 1, 0), text })
  if (key.name === 'right') return update({ cursor: Math.min(cursor + 1, text.length), text })
  if (key.name === 'home') return update({ cursor: 0, text })
  if (key.name === 'end') return update({ cursor: text.length, text })
  if (key.name === 'backspace') return cursor === 0 ? { ui } : update({ cursor: cursor - 1, text: text.slice(0, cursor - 1) + text.slice(cursor) })
  if (key.name === 'delete') return update({ cursor, text: text.slice(0, cursor) + text.slice(cursor + 1) })
  // spaces must stay while typing, the text is only trimmed when saved
  const typed = key.ctrl === true || key.sequence?.startsWith(keyEscape) === true ? '' : (key.sequence ?? '').replaceAll(/\p{Cc}/gu, '')
  const next = (text.slice(0, cursor) + typed + text.slice(cursor)).slice(0, config.maxTextLength)
  return typed === '' || next === text ? { ui } : update({ cursor: Math.min(cursor + typed.length, next.length), text: next })
}

/**
 * Tell if a device is known, new or unknown : a label with "???" means the cli could not identify the device, whatever the storage says
 * @param view the devices and the ui
 * @param device the device
 * @returns unknown if the label has "???", else new if the device is not in the storage file or appeared after the first scan, else known
 */
export function classifyDevice(view: View, device: FoundDevice & { appearedLater?: boolean }) {
  if (view.labelOf(device).includes(unknown)) return 'unknown'
  return view.isKnown(device) && device.appearedLater !== true ? 'known' : 'new'
}

type ColumnWidths = { hints: number; ip: number; name: number; network: number; response: number }

/**
 * Get the text of the cells of a device, except its name
 * @param view the devices and the ui
 * @param device the device
 * @returns the cells
 */
function cellsOf(view: View, device: TrackedDevice) {
  return {
    hints: view.showHints === true ? buildHints(device, { label: view.labelOf(device), vendor: view.vendorOf?.(device) }) : undefined,
    ip: device.ip,
    network: view.showNetwork === true ? device.interfaceNames.join('+') : undefined,
    response: device.present ? formatResponseTime(device.responseMs) : 'offline',
  }
}

const segmenter = new Intl.Segmenter()

/** emoji and the East Asian wide characters take two columns in a terminal */
const wideRegex = /\p{Emoji_Presentation}|\uFE0F|[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u

/**
 * Split a text in the characters a user sees, so an emoji or an accented letter is never cut in two
 * @param text the text
 * @returns the characters
 */
function splitGraphemes(text: string) {
  return [...segmenter.segment(text)].map(item => item.segment)
}

/**
 * Measure the columns a text takes in a terminal
 * @param text the text
 * @returns the width, an emoji counts for 2
 */
export function displayWidth(text: string) {
  return splitGraphemes(text).reduce((total, grapheme) => total + (wideRegex.test(grapheme) ? wideWidth : 1), 0)
}

/**
 * Take the first characters that fit a width
 * @param graphemes the characters
 * @param max the width available
 * @returns the characters taken
 */
function takeWidth(graphemes: readonly string[], max: number) {
  const taken: string[] = []
  let used = 0
  for (const grapheme of graphemes) {
    used += displayWidth(grapheme)
    if (used > max) break
    taken.push(grapheme)
  }
  return taken
}

/**
 * Pad a text with spaces on the right up to a width, wide characters included
 * @param text the text
 * @param width the width wanted
 * @returns the padded text
 */
function padEndDisplay(text: string, width: number) {
  return `${text}${' '.repeat(Math.max(width - displayWidth(text), 0))}`
}

/**
 * Shorten a text with an ellipsis so it fits a width
 * @param text the text
 * @param max the width available
 * @returns the text, ending with … if it was cut
 */
export function ellipsize(text: string, max: number) {
  if (displayWidth(text) <= max) return text
  return max <= 0 ? '' : `${takeWidth(splitGraphemes(text), max - 1).join('')}…`
}

/**
 * Shorten the name being edited so the cursor stays visible, the start is cut when the cursor is far in the text
 * @param before the text before the cursor
 * @param after the text after the cursor
 * @param max the width available
 * @returns the text with its cursor mark, with … where it was cut
 */
function ellipsizeAroundCursor(before: string, after: string, max: number) {
  const marked = `${before}|${after}`
  if (displayWidth(marked) <= max) return marked
  if (displayWidth(`${before}|`) <= max - 1) return ellipsize(marked, max)
  // a share of the width keeps showing what follows the cursor
  const rightWidth = Math.min(displayWidth(after), Math.floor(max / cursorTailShare))
  const left = takeWidth(splitGraphemes(`${before}|`).toReversed(), max - 1 - rightWidth)
    .toReversed()
    .join('')
  return `…${left}${takeWidth(splitGraphemes(after), rightWidth).join('')}`
}

/**
 * Size the columns to the widest cell, so the gap between two columns is the same everywhere.
 * When the terminal is too narrow the name column shrinks first, then the hints get what is left, both end with an ellipsis.
 * @param view the devices and the ui
 * @returns the width of each column
 */
function columnWidths(view: View): ColumnWidths {
  const cells = view.devices.map(device => cellsOf(view, device))
  const ip = Math.max('ip'.length, ...cells.map(cell => cell.ip.length))
  const network = Math.max('network'.length, ...view.devices.map(device => device.interfaceNames.join('+').length))
  const response = Math.max('response'.length, ...cells.map(cell => cell.response.length))
  // the name being edited can be longer than the stored one
  const editing = view.ui.edit === undefined ? [] : [displayWidth(view.ui.edit.text) + 1]
  const widestName = Math.max('name'.length, ...editing, ...view.devices.map(device => displayWidth(view.labelOf(device))))
  const widestHints = Math.max('hints'.length, ...cells.map(cell => displayWidth(cell.hints ?? '')))
  const before = [ip, response, macLength, ...(view.showNetwork === true ? [network] : [])]
  // every column before the name is followed by a gap
  const room = (view.width ?? Number.POSITIVE_INFINITY) - selectionMarkerLength - before.reduce((total, width) => total + width + columnGap.length, 0)
  const name = view.showHints === true ? Math.min(widestName, Math.max(minNameLength, room - columnGap.length - widestHints)) : Math.min(widestName, Math.max(minNameLength, room))
  return { hints: Math.max(room - name - columnGap.length, 1), ip, name, network, response }
}

/**
 * Join the cells of a line with the same gap between all the columns
 * @param prefix the selection marker, 2 chars
 * @param cells the text of each column, the hints are only there when shown
 * @param widths the width of each column
 * @returns the line
 */
function joinCells(prefix: string, cells: { hints?: string; ip: string; mac: string; name: string; network?: string; response: string }, widths: ColumnWidths) {
  return [
    `${prefix}${cells.ip.padEnd(widths.ip)}`,
    cells.response.padStart(widths.response),
    cells.mac.padEnd(macLength),
    ...(cells.network === undefined ? [] : [cells.network.padEnd(widths.network)]),
    cells.hints === undefined ? ellipsize(cells.name, widths.name) : padEndDisplay(ellipsize(cells.name, widths.name), widths.name),
    ...(cells.hints === undefined ? [] : [ellipsize(cells.hints, widths.hints)]),
  ].join(columnGap)
}

/**
 * Format one row of the report
 * @param view the devices and the ui
 * @param device the device
 * @param widths the width of each column
 * @returns the colored row
 */
function formatRow(view: View, device: TrackedDevice, widths: ColumnWidths) {
  const { ui } = view
  const isSelected = device.mac === ui.selectedMac
  const label = isSelected && ui.edit !== undefined ? ellipsizeAroundCursor(ui.edit.text.slice(0, ui.edit.cursor), ui.edit.text.slice(ui.edit.cursor), widths.name) : view.labelOf(device)
  const row = joinCells(isSelected ? '> ' : '  ', { ...cellsOf(view, device), mac: device.mac, name: label }, widths)
  const kind = classifyDevice(view, device)
  // an offline device stays dimmed, but an unknown one keeps its yellow
  if (!device.present) return kind === 'unknown' ? yellow(dim(row)) : dim(row)
  const text = isSelected ? bold(row) : row
  if (kind === 'unknown') return yellow(text)
  return kind === 'new' ? green(text) : text
}

/**
 * Format the progress line shown above the table
 * @param progress what the cli is doing
 * @returns the line, empty if there is nothing to tell
 */
export function formatProgress(progress: Progress | undefined) {
  if (progress === undefined) return ''
  if (progress.ratio === undefined) return dim(progress.label)
  const filled = Math.round(Math.min(Math.max(progress.ratio, 0), 1) * progressWidth)
  return `[${'#'.repeat(filled)}${'-'.repeat(progressWidth - filled)}] ${Math.round(progress.ratio * percentMax)}% ${progress.label}`
}

/**
 * Format the headers of the columns
 * @param view the devices and the ui
 * @param widths the width of each column
 * @returns the header row
 */
function formatHeader(view: View, widths: ColumnWidths) {
  return joinCells('  ', { hints: view.showHints === true ? 'hints' : undefined, ip: 'ip', mac: 'mac', name: 'name', network: view.showNetwork === true ? 'network' : undefined, response: 'response' }, widths)
}

/**
 * Build the legend of the keys
 * @param view the devices and the ui
 * @returns the legends, each with its key and its meaning
 */
export function legendItems(view: View) {
  if (view.ui.edit !== undefined)
    return [
      { key: '✎', text: 'type the name' },
      { key: '←→', text: 'move cursor' },
      { key: '↵', text: 'save' },
      { key: 'esc', text: 'cancel' },
    ]
  return [
    { key: '↑↓', text: 'select' },
    { key: '↵', text: 'rename' },
    { key: 'l', text: view.isLive === true ? 'live on' : 'live off' },
    { key: 'h', text: view.showHints === true ? 'hints on' : 'hints off' },
    { key: 'n', text: view.showNetwork === true ? 'network on' : 'network off' },
    { key: 'q', text: 'quit' },
  ]
}

/**
 * Put the legends in a row with the same space between them, from the left to the right of the terminal
 * @param items the legends
 * @param width the terminal width
 * @returns the row
 */
export function spreadLegend(items: readonly { key: string; text: string }[], width: number) {
  const used = items.reduce((total, item) => total + item.key.length + 1 + item.text.length, 0)
  const gaps = Math.max(items.length - 1, 1)
  const space = Math.max(width - (legendIndent + legendIndent) - used, gaps * legendMinGap)
  let row = ' '.repeat(legendIndent)
  for (const [index, item] of items.entries()) {
    // the first gaps get the extra spaces when the space does not divide evenly
    if (index > 0) row += ' '.repeat(Math.floor(space / gaps) + (index <= space % gaps ? 1 : 0))
    row += `${bold(item.key)} ${dim(item.text)}`
  }
  return row
}

/**
 * Format the summary of the devices
 * @param view the devices and the ui
 * @returns the summary line
 */
export function formatSummary(view: View) {
  const count = (kind: string) => view.devices.filter(device => classifyDevice(view, device) === kind).length
  return bold(`Net Scan : ${count('known')} known devices, ${count('new')} new, ${count('unknown')} unknown`)
}

/**
 * Pick the rows that fit the terminal height, the selected device stays in the middle of them
 * @param view the devices and the ui
 * @returns the range of the devices to show
 */
function visibleRows(view: View) {
  const count = view.devices.length
  const room = view.height === undefined ? count : Math.max(view.height - reportChromeLines, 1)
  if (room >= count) return { end: count, start: 0 }
  const selected = Math.max(
    view.devices.findIndex(device => device.mac === view.ui.selectedMac),
    0,
  )
  const start = Math.min(Math.max(selected - Math.floor(room / middleDivisor), 0), count - room)
  return { end: start + room, start }
}

/**
 * Tell how many devices are hidden above and below the rows shown
 * @param view the devices and the ui
 * @returns the line, empty if every device is shown
 */
function formatScrollHint(view: View) {
  const { end, start } = visibleRows(view)
  const hints = [start > 0 ? `↑ ${start} more` : '', end < view.devices.length ? `↓ ${view.devices.length - end} more` : ''].filter(hint => hint !== '')
  return hints.length === 0 ? '' : dim(`  ${hints.join('  ')}`)
}

/**
 * Format the table of the devices
 * @param view the devices and the ui
 * @returns the header, a blank line, then a row per device
 */
export function formatTable(view: View) {
  const widths = columnWidths(view)
  const { end, start } = visibleRows(view)
  return [dim(formatHeader(view, widths)), '', ...view.devices.slice(start, end).map(device => formatRow(view, device, widths))]
}

/**
 * Format the whole screen : title, table, progress and legend
 * @param view the sorted devices and the ui
 * @returns the lines to display
 */
export function formatReport(view: View) {
  const progress = formatProgress(view.progress)
  return ['', `  ${formatSummary(view)}`, '', ...formatTable(view), formatScrollHint(view), progress === '' ? '' : `  ${progress}`, '', spreadLegend(legendItems(view), view.width ?? defaultWidth)]
}

/* v8 ignore start */

const logger = new Logger()

const isWindows = process.platform === 'win32'

const cacheFile = path.join(homedir(), '.cache', 'net-scan', 'oui.csv')

const execFileAsync = promisify(execFile)

type SoundPlayer = { args: string[]; command: string }

/** leave the alternate screen, which gives the previous terminal content back, and show the cursor */
const restoreTerminal = '\u001B[?1049l\u001B[?25h'

const usage = `Scan the networks of this machine and list the living devices.

usage : net-scan.cli.ts [file] [options]
  file         where the names are stored, net-scan.txt by default
  --once       scan once, print the report and leave
  --hints      start with the hints column shown, h toggles it
  --network    start with the network column shown, n toggles it
  -h, --help   show this help

keys : up / down select, enter rename, l live mode, h hints, n network, q quit`

const soundFile = '/usr/share/sounds/freedesktop/stereo/message.oga'

const soundPlayers: SoundPlayer[] = [
  { args: [soundFile], command: 'pw-play' },
  { args: [soundFile], command: 'paplay' },
  { args: ['-i', 'message'], command: 'canberra-gtk-play' },
  { args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', soundFile], command: 'ffplay' },
]

/**
 * Run a command
 * @param command the command
 * @param args its arguments
 * @returns the standard output, undefined if the command failed
 */
async function run(command: string, args: string[]) {
  try {
    const { stdout } = await execFileAsync(command, args, { timeout: commandTimeoutMs })
    return stdout
  } catch {
    return undefined
  }
}

/**
 * Wait for a promise at most for a duration
 * @param promise the promise
 * @param ms the max duration
 * @returns the promise result, undefined if too long or failed
 */
async function withTimeout<Result>(promise: Promise<Result>, ms: number) {
  try {
    return await Promise.race([promise, abortedAfter(ms)])
  } catch {
    return undefined
  }
}

/**
 * Wait for a duration with a timer that does not keep the process alive nor needs to be cleared, unlike a sleep
 * @param ms the duration
 * @returns undefined once the duration is over
 */
async function abortedAfter(ms: number) {
  await once(AbortSignal.timeout(ms), 'abort')
  return undefined
}

/**
 * Download the vendors list in the cache
 */
async function downloadVendors() {
  logger.info('Downloading the vendors list...')
  try {
    // the signal also aborts the body download, unlike a timer racing the request
    const response = await fetch(config.ouiUrl, { signal: AbortSignal.timeout(downloadTimeoutMs) })
    invariant(response.ok, `vendors download failed with status ${response.status}`)
    mkdirSync(path.dirname(cacheFile), { recursive: true })
    writeFileSync(`${cacheFile}.tmp`, await response.text())
    renameSync(`${cacheFile}.tmp`, cacheFile)
  } catch (error) {
    logger.warn(`Cannot download the vendors list, ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Load the vendors, downloading the list if it is missing or too old
 * @returns the vendors by prefix, empty if unavailable
 */
async function loadVendors() {
  const modifiedAt = existsSync(cacheFile) ? statSync(cacheFile).mtimeMs : undefined
  if (isOuiStale(modifiedAt, Date.now())) await downloadVendors()
  return existsSync(cacheFile) ? parseOui(readFileSync(cacheFile, 'utf8')) : new Map<string, string>()
}

/**
 * Send a packet to many hosts and collect the answers, sending to an unknown host also makes the OS look for its MAC address
 * @param request what to send
 * @param request.hosts the hosts
 * @param request.packet gives the packet to send to a host
 * @param request.port the UDP port
 * @param request.waitMs how long to wait for answers after sending
 * @returns the answers by IP
 */
async function ask(request: { hosts: readonly string[]; packet: (host: string) => Buffer; port: number; waitMs: number }) {
  const socket = createSocket('udp4')
  const answers = new Map<string, Buffer>()
  socket.on('message', (message, remote) => answers.set(remote.address, message))
  socket.on('error', () => undefined)
  // sending by batches avoids flooding the OS while it looks for the MAC addresses
  for (const [index, host] of request.hosts.entries()) setTimeout(() => socket.send(request.packet(host), request.port, host), Math.floor(index / sendBatchSize) * sendPauseMs)
  await sleep((Math.floor(request.hosts.length / sendBatchSize) + 1) * sendPauseMs + request.waitMs)
  socket.close()
  return answers
}

/**
 * Read the neighbors known by the OS
 * @returns the IP and MAC addresses
 */
async function readNeighbors() {
  if (isWindows) return parseArpA((await run('arp', ['-a'])) ?? '')
  const output = await run('ip', ['-4', 'neigh', 'show'])
  if (output !== undefined) return parseIpNeigh(output)
  return existsSync('/proc/net/arp') ? parseProcNetArp(readFileSync('/proc/net/arp', 'utf8')) : []
}

/**
 * Time a TCP connection attempt : a device answers either by accepting or by refusing the connection
 * @param ip the device address
 * @param port the TCP port
 * @returns the duration in milliseconds, undefined if nothing answered in time
 */
async function timeConnection(ip: string, port: number) {
  const socket = connect({ host: ip, port })
  const startedAt = performance.now()
  let hasAnswered = false
  try {
    hasAnswered = Array.isArray(await Promise.race([once(socket, 'connect'), sleep(responseTimeoutMs)]))
  } catch (error) {
    // a refused connection is an answer too
    hasAnswered = (error as NodeJS.ErrnoException).code === 'ECONNREFUSED'
  }
  socket.destroy()
  return hasAnswered ? performance.now() - startedAt : undefined
}

/**
 * Time a UDP datagram sent to a closed port : the device answers with an ICMP "port unreachable" error
 * @param ip the device address
 * @returns the duration in milliseconds, undefined if nothing answered in time
 */
async function timeUdp(ip: string) {
  const socket = createSocket('udp4')
  let startedAt = performance.now()
  let hasAnswered = false
  try {
    socket.connect(closedUdpPort, ip)
    await once(socket, 'connect')
    startedAt = performance.now()
    socket.send(Buffer.alloc(1))
    hasAnswered = Array.isArray(await Promise.race([once(socket, 'message'), sleep(responseTimeoutMs)]))
  } catch (error) {
    hasAnswered = (error as NodeJS.ErrnoException).code === 'ECONNREFUSED'
  }
  socket.close()
  return hasAnswered ? performance.now() - startedAt : undefined
}

/**
 * Tell if a TCP port accepts a connection, a refusal does not count here
 * @param ip the device address
 * @param port the TCP port
 * @returns true if the connection was accepted in time
 */
async function isPortOpen(ip: string, port: number) {
  const socket = connect({ host: ip, port })
  try {
    return Array.isArray(await Promise.race([once(socket, 'connect'), abortedAfter(responseTimeoutMs)]))
  } catch {
    return false
  } finally {
    socket.destroy()
  }
}

/**
 * Find which ports of a device accept a connection
 * @param ip the device address
 * @returns the services accepting a connection
 */
async function scanPorts(ip: string): Promise<PortScan> {
  const services = Object.entries(responsePorts)
  const answers = await Promise.all(services.map(([, port]) => isPortOpen(ip, port)))
  return { open: services.filter((_service, index) => answers[index]).map(([service]) => kebabCase(service)) }
}

/**
 * Try every way of getting an answer from a device once, the first answer wins so a device with some filtered ports is not slowed down by the timeout
 * @param ip the device address
 * @returns the fastest answer in milliseconds, undefined if the device did not answer
 */
async function probeOnce(ip: string) {
  const probes = [...Object.values(responsePorts).map(port => timeConnection(ip, port)), timeUdp(ip)]
  const answers = probes.map(async probe => {
    const duration = await probe
    invariant(duration !== undefined, 'no answer')
    return duration
  })
  try {
    return await Promise.any(answers)
  } catch {
    return undefined
  }
}

/**
 * Measure how long a device takes to answer, without needing the root rights a ping needs.
 * Sleepy devices like cameras on wifi often ignore the first packets, so a second try is made.
 * @param ip the device address
 * @returns the fastest answer in milliseconds, undefined if the device does not answer
 */
async function measureResponse(ip: string) {
  const first = await probeOnce(ip)
  if (first !== undefined) return first
  await sleep(retryDelayMs)
  return probeOnce(ip)
}

/**
 * Collect the NetBIOS names of the hosts of every target
 * @param targets the networks
 * @returns the names by IP
 */
async function collectNetbiosNames(targets: readonly ScanTarget[]) {
  const names = new Map<string, string>()
  const answers = await Promise.all(targets.map(target => ask({ hosts: target.hosts, packet: buildNbstatQuery, port: nbstatPort, waitMs: nbstatWaitMs })))
  for (const [ip, packet] of answers.flatMap(map => [...map])) {
    const name = parseNbstatAnswer(packet)
    if (name !== undefined) names.set(ip, name)
  }
  return names
}

/**
 * Collect the mDNS names of some hosts, with one socket for all of them
 * @param hosts the addresses to ask
 * @returns the names by IP
 */
async function collectMdnsNames(hosts: readonly string[]) {
  const names = new Map<string, string>()
  const answers = await ask({ hosts, packet: buildMdnsQuery, port: mdnsPort, waitMs: mdnsWaitMs })
  for (const [ip, packet] of answers) {
    const name = parseMdnsAnswer(packet)
    if (name !== undefined) names.set(ip, name)
  }
  return names
}

/**
 * Find every name of a device : the mDNS and NetBIOS names are already collected, the reverse DNS is asked now
 * @param device the device
 * @param names the mDNS and NetBIOS names by IP
 * @param names.mdns the mDNS names
 * @param names.netbios the NetBIOS names
 * @param previous the device as tracked by the previous sweeps, its reverse DNS name is kept instead of asking again
 * @returns the names by source, empty if nothing answered
 */
async function findNames(device: FoundDevice, names: { mdns: ReadonlyMap<string, string>; netbios: ReadonlyMap<string, string> }, previous: TrackedDevice | undefined) {
  const found: NonNullable<FoundDevice['names']> = {}
  const mdns = names.mdns.get(device.ip)
  const netbios = names.netbios.get(device.ip)
  // the reverse DNS name rarely changes, so only a device seen for the first time is asked
  let reverseName = previous?.names?.dns ?? ''
  if (previous === undefined) {
    const reverse = await withTimeout(dns.reverse(device.ip), dnsWaitMs)
    if (reverse?.[0] !== undefined) reverseName = sanitizeText(reverse[0].replace(/\.$/u, ''))
  }
  if (mdns !== undefined) found.mdns = mdns
  if (netbios !== undefined) found.netbios = netbios
  if (reverseName !== '') found.dns = reverseName
  return found
}

/**
 * Run a task on every item with a limited number of tasks at the same time, each device opens a lot of sockets
 * @param items the items
 * @param limit the max number of tasks running at the same time
 * @param task what to do with an item
 */
async function runLimited<Item>(items: readonly Item[], limit: number, task: (item: Item) => Promise<void>) {
  const queue = [...items]
  const worker = async (): Promise<void> => {
    const item = queue.shift()
    if (item === undefined) return
    await task(item)
    await worker()
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

/**
 * Scan every network of this machine
 * @param targets the networks
 * @param known the devices tracked by the previous sweeps, their ports are not scanned again
 * @param report tells what the sweep is doing
 * @returns the devices found, with the best name known
 */
async function sweep(targets: readonly ScanTarget[], known: ReadonlyMap<string, TrackedDevice>, report: (progress: Progress) => void) {
  const found = new Map<string, FoundDevice>()
  report({ label: `asking ${targets.reduce((total, target) => total + target.hosts.length, 0)} addresses`, ratio: 0 })
  const netbiosNames = await collectNetbiosNames(targets)
  report({ label: 'reading the neighbors', ratio: sweepSteps.probed })
  const neighbors = await readNeighbors()
  for (const target of targets) {
    const hosts = new Set(target.hosts)
    for (const neighbor of neighbors) if (hosts.has(neighbor.ip) && !isGroupMac(neighbor.mac)) found.set(neighbor.mac, { interfaceNames: target.interfaceNames, ip: neighbor.ip, mac: neighbor.mac })
    for (const own of target.own) found.set(own.mac, { interfaceNames: target.interfaceNames, ip: own.ip, mac: own.mac, name: sanitizeText(hostname()), names: { hostname: sanitizeText(hostname()) } })
  }
  let identified = 0
  const devices = [...found.values()]
  const total = devices.length
  report({ label: `identifying ${total} devices`, ratio: sweepSteps.listed })
  const mdnsNames = await collectMdnsNames(devices.filter(device => device.name === undefined).map(device => device.ip))
  await runLimited(devices, identifyConcurrency, async device => {
    const [names, responseMs, ports] = await Promise.all([
      device.names ?? findNames(device, { mdns: mdnsNames, netbios: netbiosNames }, known.get(device.mac)),
      measureResponse(device.ip),
      known.get(device.mac)?.ports === undefined ? scanPorts(device.ip) : undefined,
    ])
    device.names = Object.keys(names).length === 0 ? undefined : names
    device.name = bestName(names)
    device.responseMs = responseMs
    device.ports = ports
    identified += 1
    report({ label: `identifying devices ${identified}/${total}`, ratio: sweepSteps.listed + (1 - sweepSteps.listed) * (identified / total) })
  })
  return devices
}

/** everything the running cli shares between the sweeps and the keys */
type Session = {
  backedUp: boolean
  devices: Map<string, TrackedDevice>
  file: string
  interactive: boolean
  isLive: boolean
  isOver: boolean
  isSweeping: boolean
  labels: Map<string, string>
  progress?: Progress
  showHints: boolean
  showNetwork: boolean
  sweeps: number
  targets: readonly ScanTarget[]
  ui: Ui
  vendors: ReadonlyMap<string, string>
}

/**
 * Build the view of the current devices
 * @param session the running session
 * @returns the view
 */
function viewOf(session: Session): View {
  return {
    devices: [...session.devices.values()].toSorted(compareByIp),
    height: session.interactive ? process.stdout.rows : undefined,
    isKnown: device => session.labels.has(device.mac),
    isLive: session.isLive,
    labelOf: device => session.labels.get(device.mac) ?? buildLabel(device.name, lookupVendor(session.vendors, device.mac)),
    progress: session.progress,
    showHints: session.showHints,
    showNetwork: session.showNetwork,
    ui: session.ui,
    vendorOf: device => lookupVendor(session.vendors, device.mac),
    width: process.stdout.columns,
  }
}

/**
 * Show the report, only in a terminal
 * @param session the running session
 */
function render(session: Session) {
  // repainting in place (home, erase each line end, erase below) instead of clearing the screen avoids the flicker
  if (session.interactive) process.stdout.write(`\u001B[H${formatReport(viewOf(session)).join('\u001B[K\n')}\u001B[K\n\u001B[J`)
}

/**
 * Leave right away, without waiting for the scan in progress which can take several seconds
 * @param session the running session
 */
function quit(session: Session) {
  session.isOver = true
  process.stdin.setRawMode(false)
  process.stdout.write(`${restoreTerminal}Bye, stopping the scan...\n`)
  process.exit(0)
}

/**
 * Turn the live mode on or off : when it is off the scan stops after the current sweep, when it is on again sweeping restarts
 * @param session the running session
 */
function toggleLive(session: Session) {
  session.isLive = !session.isLive
  if (session.isLive && !session.isSweeping) void sweepLoop(session)
}

/**
 * Handle a keypress : navigate, edit, save or quit
 * @param session the running session
 * @param key the key
 */
function onKey(session: Session, key: Key) {
  const result = handleKey(viewOf(session), key)
  session.ui = result.ui
  if (result.save !== undefined)
    try {
      saveLabel(session.file, result.save, session)
      session.labels = readLabels(readFileSync(session.file, 'utf8'))
    } catch (error) {
      // the file can disappear, like an unmounted network share, this must not crash the cli in raw mode
      session.progress = { label: `cannot save the name, ${error instanceof Error ? error.message : String(error)}` }
    }
  if (result.toggleHints === true) session.showHints = !session.showHints
  if (result.toggleNetwork === true) session.showNetwork = !session.showNetwork
  if (result.toggleLive === true) toggleLive(session)
  if (result.quit === true) quit(session)
  else render(session)
}

/**
 * Play a sound with the first player that works, ring the terminal bell if none does
 * @param players the sound players to try, in order
 */
async function playSound(players: readonly SoundPlayer[]) {
  const [player, ...others] = players
  if (player === undefined) process.stdout.write('\u0007')
  else if ((await run(player.command, player.args)) === undefined) await playSound(others)
}

/**
 * Notify the user with a desktop notification and a sound
 * @param appeared the devices that just appeared
 * @param labelOf gives the label of a device
 */
function notify(appeared: readonly FoundDevice[], labelOf: (device: FoundDevice) => string) {
  const commands = buildNotificationCommands({ environment: process.env, platform: process.platform }, describeAppeared(appeared, labelOf))
  for (const { args, command } of commands) execFile(command, args, () => undefined)
  // the sound players differ between the desktops : PipeWire, PulseAudio, libcanberra then ffmpeg
  void playSound(commands.length === 0 ? [] : soundPlayers)
}

/**
 * Sweep the networks once, update the devices and notify the new ones
 * @param session the running session
 */
async function sweepOnce(session: Session) {
  const found = await sweep(session.targets, session.devices, progress => {
    session.progress = progress
    render(session)
  })
  const result = applySweep(session.devices, found, { baseline: session.sweeps === 0, nowMs: Date.now() })
  session.sweeps += 1
  session.devices = result.devices
  const view = viewOf(session)
  if (session.ui.selectedMac === undefined) session.ui = { ...session.ui, selectedMac: view.devices[0]?.mac }
  session.progress = { label: 'scan done' }
  render(session)
  if (result.appeared.length > 0) notify(result.appeared, view.labelOf)
}

/**
 * Sweep the networks again and again while the live mode is on, until the user quits
 * @param session the running session
 */
async function sweepLoop(session: Session) {
  session.isSweeping = true
  try {
    await sweepOnce(session)
    if (session.isOver) return
    if (session.isLive) await countdown(session, config.sweepIntervalMs)
  } catch (error) {
    // the first sweep failing is a startup error, a later one must not kill a cli running for days
    if (session.sweeps === 0) throw error
    session.progress = { label: `scan stopped, ${error instanceof Error ? error.message : String(error)}` }
    render(session)
    return
  } finally {
    session.isSweeping = false
  }
  if (session.isOver) return
  if (session.isLive) {
    // not awaited, so a cli running for days does not pile up one pending promise per sweep
    void sweepLoop(session)
    return
  }
  session.progress = { label: 'scan done, live mode off : press l to scan continuously' }
  render(session)
}

/**
 * Wait for the next sweep while showing the remaining time, it stops when the live mode is turned off
 * @param session the running session
 * @param remainingMs the time left
 */
async function countdown(session: Session, remainingMs: number) {
  session.progress = { label: `next scan in ${Math.ceil(remainingMs / msInSecond)}s` }
  render(session)
  await sleep(msInSecond)
  // only 30 levels deep, unlike the sweeps
  if (remainingMs > msInSecond && !session.isOver && session.isLive) await countdown(session, remainingMs - msInSecond)
}

/**
 * Listen to the keyboard, in raw mode so the keys are received one by one
 * @param session the running session
 */
function listenToKeys(session: Session) {
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  // the alternate screen keeps the user's scrollback safe, and the exit event also fires after a crash
  process.stdout.write('\u001B[?1049h\u001B[2J\u001B[?25l')
  process.stdout.on('resize', () => render(session))
  process.on('exit', () => process.stdout.write(restoreTerminal))
  for (const signal of ['SIGHUP', 'SIGTERM'] as const) process.on(signal, () => process.exit(0))
  process.stdin.on('keypress', (sequence: string | undefined, key: Key | undefined) => {
    onKey(session, { ...key, sequence })
  })
}

/**
 * Start the cli
 */
async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: process.argv.slice(firstArgumentIndex),
    options: { help: { short: 'h', type: 'boolean' }, hints: { type: 'boolean' }, network: { type: 'boolean' }, once: { type: 'boolean' } },
  })
  if (values.help === true) {
    process.stdout.write(`${usage}\n`)
    return
  }
  const file = path.resolve(positionals[0] ?? 'net-scan.txt')
  if (process.platform !== 'linux' && !isWindows) throw new Error(`Unsupported platform "${process.platform}", only Linux and Windows are supported`)
  const targets = pickTargets(networkInterfaces())
  if (targets.length === 0) throw new Error('No active network found')
  const backedUp = !ensureStore(file)
  // --once prints the report and leaves, even in a terminal
  const interactive = process.stdin.isTTY && process.stdout.isTTY && values.once !== true
  const isLive = interactive
  const session: Session = {
    backedUp,
    devices: new Map(),
    file,
    interactive,
    isLive,
    isOver: false,
    isSweeping: false,
    labels: readLabels(readFileSync(file, 'utf8')),
    showHints: values.hints === true,
    showNetwork: values.network === true,
    sweeps: 0,
    targets,
    ui: {},
    vendors: await loadVendors(),
  }
  if (interactive) listenToKeys(session)
  logger.info(`Scanning ${targets.map(target => target.interfaceNames.join('+')).join(', ')}...`)
  await sweepLoop(session)
  // when the live mode is off, the keys keep the process alive until the user quits
  if (!interactive) process.stdout.write(`${[formatSummary(viewOf(session)), ...formatTable(viewOf(session))].join('\n')}\n`)
}

/* v8 ignore stop */

// avoid running this script if it's imported for testing
/* v8 ignore if */
if (process.argv[1]?.includes('net-scan.cli.ts'))
  try {
    await main()
  } catch (error) {
    process.stdout.write('\n')
    logger.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
