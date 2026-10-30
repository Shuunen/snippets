import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { type NetworkInterfaceInfo, tmpdir } from 'node:os'
import path from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { invariant } from 'es-toolkit'
import { dim, yellow } from 'shuutils'
import {
  applySweep,
  buildDnsQuery,
  bestName,
  buildHints,
  buildLabel,
  buildMdnsQuery,
  buildNbstatQuery,
  buildNotificationCommands,
  compareByIp,
  config,
  describeAppeared,
  ellipsize,
  classifyDevice,
  formatProgress,
  formatResponseTime,
  ensureStore,
  formatReport,
  formatTable,
  type FoundDevice,
  handleKey,
  intToIp,
  ipToInt,
  isLocallyAdministered,
  isOuiStale,
  legendItems,
  lookupVendor,
  normalizeMac,
  parseArpA,
  parseIpNeigh,
  parseMdnsAnswer,
  parseNbstatAnswer,
  parseOui,
  parseProcNetArp,
  pickTargets,
  readLabels,
  sanitizeText,
  saveLabel,
  spreadLegend,
  subnetHosts,
  type TrackedDevice,
  type Ui,
  updateStoreContent,
} from './net-scan.cli'

const mac1 = '98B785211BA5'
const mac2 = 'AABBCCDDEEFF'

/**
 * Create a found device
 * @param ip the ip
 * @param mac the mac
 * @returns the device
 */
function device(ip: string, mac: string): FoundDevice {
  return { interfaceNames: ['eth0'], ip, mac }
}

/**
 * Create a tracked device
 * @param ip the ip
 * @param mac the mac
 * @param online true if online
 * @returns the device
 */
function tracked(ip: string, mac: string, online = true): TrackedDevice {
  return { ...device(ip, mac), appearedLater: false, missed: 0, online, present: online }
}

const labelOf = (item: FoundDevice) => `label ${item.ip}`

const longLabel = (item: FoundDevice) => `${item.ip} a very long name that cannot fit (Vendor Inc.)`

/**
 * Create a network interface address
 * @param address the ip
 * @param mac the mac
 * @param extra the properties to change
 * @returns the address
 */
function networkInfo(address: string, mac: string, extra: Partial<NetworkInterfaceInfo> = {}) {
  return { address, cidr: '0.0.0.0/0', family: 'IPv4', internal: false, mac, netmask: '255.255.255.0', ...extra } as NetworkInterfaceInfo
}

/**
 * Build a DNS answer packet
 * @param records the encoded records following the header
 * @param questions the number of questions
 * @param answers the number of answers
 * @returns the packet
 */
function packet(records: Buffer[], questions: number, answers: number) {
  const header = Buffer.alloc(12)
  header.writeUInt16BE(questions, 4)
  header.writeUInt16BE(answers, 6)
  return Buffer.concat([header, ...records])
}
const question = buildDnsQuery('4.1.168.192.in-addr.arpa', 12, 1).subarray(12)
/**
 * Build a PTR record using a compression pointer for its name
 * @param type the record type
 * @param target the name in the data
 * @returns the record
 */
function record(type: number, target: string) {
  const data = Buffer.from(`${String.fromCodePoint(target.length)}${target}\u0000`, 'latin1')
  const head = Buffer.from([0xc0, 12, 0, type, 0, 1, 0, 0, 0, 120, 0, data.length])
  return Buffer.concat([head, data])
}

/**
 * Encode a NetBIOS name entry
 * @param name the name
 * @param suffix the suffix byte
 * @param flags the flags
 * @returns the 18 bytes entry
 */
function entry(name: string, suffix: number, flags: number) {
  const buffer = Buffer.alloc(18)
  buffer.write(name.padEnd(15, ' '), 'latin1')
  buffer.writeUInt8(suffix, 15)
  buffer.writeUInt16BE(flags, 16)
  return buffer
}

describe('net-scan texts', () => {
  it('sanitizeText A removes control chars, trims and caps the length', () => {
    expect(sanitizeText('  Tv\u001B[31m\nsalon\u0000  ')).toBe('Tv[31msalon')
    expect(sanitizeText('a'.repeat(200))).toHaveLength(config.maxTextLength)
  })

  it('normalizeMac A accepts the usual formats', () => {
    expect(normalizeMac('98:b7:85:21:1b:a5')).toBe(mac1)
    expect(normalizeMac('98-B7-85-21-1B-A5')).toBe(mac1)
    expect(normalizeMac('98b7.8521.1ba5')).toBe(mac1)
  })

  it('normalizeMac B rejects other texts', () => {
    expect(normalizeMac('')).toBeUndefined()
    expect(normalizeMac('98:b7:85')).toBeUndefined()
    expect(normalizeMac('zz:b7:85:21:1b:a5')).toBeUndefined()
  })

  it('isLocallyAdministered A detects random macs', () => {
    expect(isLocallyAdministered('DAA119000000')).toBe(true)
    expect(isLocallyAdministered(mac1)).toBe(false)
  })

  it('buildLabel A fills the blanks', () => {
    expect(buildLabel('Steam Link', 'Valve Corporation')).toBe('Steam Link (Valve Corporation)')
    expect(buildLabel(undefined, 'Valve Corporation')).toBe('??? (Valve Corporation)')
    expect(buildLabel('', undefined)).toBe('??? (???)')
    expect(buildLabel('Tv', '')).toBe('Tv (???)')
  })
})

describe('net-scan storage', () => {
  const content = `${mac1}=Tour Rom Le Duc 10 GbE (Shenzhen 10Gtek Transceivers Co., Limited)\n# a comment\nnot a device\n${mac2}=Box = fast\n`

  it('readLabels A reads labels, ignores other lines and keeps the last duplicate', () => {
    const labels = readLabels(`﻿${content}${mac1}=Renamed\r\n`)
    expect(labels.get(mac1)).toBe('Renamed')
    expect(labels.get(mac2)).toBe('Box = fast')
    expect(labels.size).toBe(2)
  })

  it('updateStoreContent A replaces only the line of the device', () => {
    expect(updateStoreContent(content, mac2, 'Router')).toBe(`${mac1}=Tour Rom Le Duc 10 GbE (Shenzhen 10Gtek Transceivers Co., Limited)\n# a comment\nnot a device\n${mac2}=Router\n`)
  })

  it('updateStoreContent B appends a new device and keeps CRLF and BOM', () => {
    expect(updateStoreContent(`﻿${mac1}=Tv\r\n`, mac2, 'Router')).toBe(`﻿${mac1}=Tv\r\n${mac2}=Router\r\n`)
  })

  it('updateStoreContent D adds a missing final line break', () => {
    expect(updateStoreContent(`${mac1}=Tv`, mac2, 'Router')).toBe(`${mac1}=Tv\n${mac2}=Router\n`)
  })

  it('updateStoreContent C works on an empty file', () => {
    expect(updateStoreContent('', mac1, 'Tv')).toBe(`${mac1}=Tv\n`)
  })
  describe('files', () => {
    let folder = ''
    beforeEach(() => {
      folder = mkdtempSync(path.join(tmpdir(), 'net-scan-'))
    })
    afterEach(() => {
      rmSync(folder, { force: true, recursive: true })
    })

    it('ensureStore A creates a missing file only', () => {
      const file = path.join(folder, 'net-scan.txt')
      expect(ensureStore(file)).toBe(false)
      expect(readFileSync(file, 'utf8')).toBe('')
      writeFileSync(file, 'x')
      expect(ensureStore(file)).toBe(true)
      expect(readFileSync(file, 'utf8')).toBe('x')
    })

    it('saveLabel A backs up once per run and keeps updating the main file', () => {
      const file = path.join(folder, 'net-scan.txt')
      writeFileSync(file, `${mac1}=Tv\n`)
      const session = { backedUp: false }
      saveLabel(file, { label: 'Tv 1', mac: mac1 }, session)
      saveLabel(file, { label: 'Router', mac: mac2 }, session)
      saveLabel(file, { label: 'Tv 2', mac: mac1 }, session)
      expect(readFileSync(`${file}.bak`, 'utf8')).toBe(`${mac1}=Tv\n`)
      expect(readFileSync(file, 'utf8')).toBe(`${mac1}=Tv 2\n${mac2}=Router\n`)
      expect(existsSync(`${file}.tmp`)).toBe(false)
    })

    it('saveLabel B overwrites the .bak of a previous run with the up to date file', () => {
      const file = path.join(folder, 'net-scan.txt')
      writeFileSync(file, `${mac1}=Tv\n`)
      writeFileSync(`${file}.bak`, 'old')
      saveLabel(file, { label: 'Tv 1', mac: mac1 }, { backedUp: false })
      saveLabel(file, { label: 'Tv 2', mac: mac1 }, { backedUp: true })
      expect(readFileSync(`${file}.bak`, 'utf8')).toBe(`${mac1}=Tv\n`)
    })

    it('saveLabel D writes in place when the temporary file cannot be used', () => {
      const file = path.join(folder, 'net-scan.txt')
      writeFileSync(file, `${mac1}=Tv\n`)
      mkdirSync(`${file}.tmp`)
      saveLabel(file, { label: 'Tv 1', mac: mac1 }, { backedUp: false })
      expect(readFileSync(file, 'utf8')).toBe(`${mac1}=Tv 1\n`)
      expect(readFileSync(`${file}.bak`, 'utf8')).toBe(`${mac1}=Tv\n`)
      expect(existsSync(`${file}.tmp`)).toBe(false)
    })

    it('saveLabel C does not make a .bak when the file was created by this run', () => {
      const file = path.join(folder, 'net-scan.txt')
      writeFileSync(file, '')
      copyFileSync(file, path.join(folder, 'copy.txt'))
      saveLabel(file, { label: 'Tv', mac: mac1 }, { backedUp: true })
      expect(existsSync(`${file}.bak`)).toBe(false)
    })
  })
})

describe('net-scan networks', () => {
  it('ipToInt and intToIp A convert both ways', () => {
    expect(ipToInt('192.168.12.44')).toBe(3_232_238_636)
    expect(intToIp(3_232_238_636)).toBe('192.168.12.44')
  })

  it('subnetHosts A lists the 254 hosts of a /24', () => {
    const hosts = subnetHosts('192.168.12.44', '255.255.255.0')
    expect(hosts).toHaveLength(254)
    expect(hosts[0]).toBe('192.168.12.1')
    expect(hosts.at(-1)).toBe('192.168.12.254')
  })

  it('subnetHosts B reduces a /16 to the /22 containing the address', () => {
    const hosts = subnetHosts('10.1.6.9', '255.255.0.0')
    expect(hosts).toHaveLength(1022)
    expect(hosts[0]).toBe('10.1.4.1')
    expect(hosts.at(-1)).toBe('10.1.7.254')
  })

  it('subnetHosts C returns nothing for a /31 or /32', () => {
    expect(subnetHosts('10.0.0.1', '255.255.255.254')).toStrictEqual([])
    expect(subnetHosts('10.0.0.1', '255.255.255.255')).toStrictEqual([])
  })

  it('pickTargets A keeps real networks and merges shared subnets', () => {
    const targets = pickTargets({
      docker0: [networkInfo('172.17.0.1', '02:42:ac:11:00:01')],
      enp5s0f0: [networkInfo('192.168.1.99', '98:b7:85:21:1b:a5'), networkInfo('fe80::1', '98:b7:85:21:1b:a5', { family: 'IPv6' })],
      lo: [networkInfo('127.0.0.1', '00:00:00:00:00:00', { internal: true })],
      other: [networkInfo('169.254.1.1', 'aa:bb:cc:dd:ee:01'), networkInfo('10.0.0.2', 'zz')],
      undefinedInterface: undefined,
      wlan0: [networkInfo('192.168.1.120', 'aa:bb:cc:dd:ee:02'), networkInfo('10.9.0.2', '00:00:00:00:00:00')],
    })
    expect(targets).toHaveLength(1)
    expect(targets[0]?.interfaceNames).toStrictEqual(['enp5s0f0', 'wlan0'])
    expect(targets[0]?.own).toStrictEqual([
      { ip: '192.168.1.99', mac: mac1 },
      { ip: '192.168.1.120', mac: 'AABBCCDDEE02' },
    ])
    expect(targets[0]?.hosts).toHaveLength(254)
  })

  it('pickTargets C ignores a network without hosts', () => {
    const info = networkInfo('10.0.0.1', 'aa:bb:cc:dd:ee:01', { netmask: '255.255.255.255' })
    expect(pickTargets({ eth0: [info] })).toStrictEqual([])
  })

  it('pickTargets B keeps the interface name once when it has several addresses', () => {
    const targets = pickTargets({ eth0: [networkInfo('192.168.1.2', 'aa:bb:cc:dd:ee:01'), networkInfo('192.168.1.3', 'aa:bb:cc:dd:ee:01')] })
    expect(targets[0]?.interfaceNames).toStrictEqual(['eth0'])
  })

  it('parseIpNeigh A reads valid entries only', () => {
    const output = [
      '192.168.1.1 dev eth0 lladdr 98:b7:85:21:1b:a5 REACHABLE',
      '192.168.1.5 dev eth0 lladdr aa:bb:cc:dd:ee:ff STALE',
      '192.168.1.7 dev eth0  FAILED',
      '192.168.1.8 dev eth0 lladdr aa:bb:cc:dd:ee:01 FAILED',
      'garbage',
      '192.168.1.9 dev eth0 INCOMPLETE',
    ].join('\n')
    expect(parseIpNeigh(output)).toStrictEqual([
      { ip: '192.168.1.1', mac: mac1 },
      { ip: '192.168.1.5', mac: mac2 },
    ])
  })

  it('parseProcNetArp A reads complete entries only', () => {
    const content = [
      'IP address       HW type     Flags       HW address            Mask     Device',
      '192.168.1.1      0x1         0x2         98:b7:85:21:1b:a5     *        eth0',
      '192.168.1.2      0x1         0x0         00:00:00:00:00:00     *        eth0',
      '',
      '192.168.1.3      0x1         0x2         bad     *        eth0',
    ].join('\n')
    expect(parseProcNetArp(content)).toStrictEqual([{ ip: '192.168.1.1', mac: mac1 }])
  })

  it('parseArpA A reads dynamic unicast entries only', () => {
    const output = [
      'Interface: 192.168.1.99 --- 0x5',
      '  Internet Address      Physical Address      Type',
      '  192.168.1.1           98-b7-85-21-1b-a5     dynamic',
      '  192.168.1.255         ff-ff-ff-ff-ff-ff     static',
      '  224.0.0.22            01-00-5e-00-00-16     static',
      '  192.168.1.4           01-00-5e-00-00-16     dynamic',
    ].join('\r\n')
    expect(parseArpA(output)).toStrictEqual([{ ip: '192.168.1.1', mac: mac1 }])
  })
})

describe('net-scan vendors', () => {
  const csv = [
    'Registry,Assignment,Organization Name,Organization Address',
    'MA-L,98B785,"Shenzhen 10Gtek Transceivers Co., Limited","Room 1 ""A"" Shenzhen"',
    'MA-L,001122,Plain Vendor,Somewhere',
    'MA-M,1234567,Too Long,x',
    'MA-L,ZZZZZZ,Not Hexa,x',
    'MA-L,AABBCC,,x',
    '',
  ].join('\n')

  it('parseOui A reads quoted and plain fields', () => {
    const vendors = parseOui(csv)
    expect(vendors.size).toBe(2)
    expect(lookupVendor(vendors, mac1)).toBe('Shenzhen 10Gtek Transceivers Co., Limited')
    expect(lookupVendor(vendors, '001122334455')).toBe('Plain Vendor')
    expect(lookupVendor(vendors, mac2)).toBeUndefined()
  })

  it('isOuiStale A is true when missing or older than a month', () => {
    const now = Date.now()
    expect(isOuiStale(undefined, now)).toBe(true)
    expect(isOuiStale(now - config.ouiMaxAgeMs - 1, now)).toBe(true)
    expect(isOuiStale(now - config.ouiMaxAgeMs + 1000, now)).toBe(false)
  })
})

describe('net-scan packets', () => {
  it('buildDnsQuery A encodes the labels', () => {
    const query = buildDnsQuery('a.bc', 12, 0x80_01)
    expect(query.subarray(12).toString('hex')).toBe('016102626300000c8001')
  })

  it('buildMdnsQuery A asks the reverse name with the unicast bit', () => {
    const query = buildMdnsQuery('192.168.1.4')
    expect(query.toString('latin1')).toContain('arpa')
    expect(query.readUInt16BE(query.length - 2)).toBe(0x80_01)
  })

  it('buildNbstatQuery A is a 50 bytes node status question', () => {
    const query = buildNbstatQuery()
    expect(query).toHaveLength(50)
    expect(query.readUInt16BE(46)).toBe(0x21)
  })

  it('parseMdnsAnswer A reads a PTR answer through a compression pointer', () => {
    const answer = packet([question, record(12, 'steamlink.local')], 1, 1)
    expect(parseMdnsAnswer(answer)).toBe('steamlink')
  })

  it('parseMdnsAnswer B skips other records, then finds the PTR one', () => {
    const answer = packet([question, record(1, 'x'), record(12, 'My-Box.local')], 1, 2)
    expect(parseMdnsAnswer(answer)).toBe('My-Box')
  })

  it('parseMdnsAnswer C returns undefined without PTR, with a loop or truncated', () => {
    const other = packet([question, record(1, 'x')], 1, 1)
    expect(parseMdnsAnswer(other)).toBeUndefined()
    const loop = packet([Buffer.from([0xc0, 12])], 0, 1)
    expect(parseMdnsAnswer(loop)).toBeUndefined()
    expect(parseMdnsAnswer(Buffer.alloc(3))).toBeUndefined()
    expect(parseMdnsAnswer(packet([question], 1, 0))).toBeUndefined()
  })

  it('parseNbstatAnswer A reads the first unique computer name', () => {
    const body = Buffer.concat([Buffer.from(` CK${'A'.repeat(30)}\u0000`, 'latin1'), Buffer.alloc(10), Buffer.from([4]), entry('WORKGROUP', 0, 0x80_00), entry('SALON-PC', 0x20, 0), entry('SALON-PC', 0, 0x04_00), entry('LATE', 0, 0)])
    const answer = packet([body], 0, 1)
    expect(parseNbstatAnswer(answer)).toBe('SALON-PC')
  })

  it('parse answers C return undefined for empty names', () => {
    const emptyName = packet([question, record(12, '.local')], 1, 1)
    expect(parseMdnsAnswer(emptyName)).toBeUndefined()
    const blank = Buffer.alloc(18, ' ')
    blank.writeUInt8(0, 15)
    blank.writeUInt16BE(0, 16)
    const body = Buffer.concat([Buffer.from(` CK${'A'.repeat(30)}\u0000`, 'latin1'), Buffer.alloc(10), Buffer.from([1]), blank])
    expect(parseNbstatAnswer(packet([body], 0, 1))).toBeUndefined()
  })

  it('parseNbstatAnswer B returns undefined when truncated or without name', () => {
    expect(parseNbstatAnswer(Buffer.alloc(3))).toBeUndefined()
    const none = Buffer.concat([Buffer.alloc(12), Buffer.from([0xc0, 12]), Buffer.alloc(10), Buffer.from([0])])
    expect(parseNbstatAnswer(none)).toBeUndefined()
  })
})

describe('net-scan response time', () => {
  it('formatResponseTime A formats milliseconds', () => {
    expect(formatResponseTime(undefined)).toBe('-')
    expect(formatResponseTime(1.234)).toBe('1 ms')
    expect(formatResponseTime(33.6)).toBe('34 ms')
  })
})

describe('net-scan tracking', () => {
  const baselineOptions = { baseline: true, nowMs: 1000 }

  it('applySweep A announces nothing on the baseline sweep', () => {
    const { appeared, devices } = applySweep(new Map(), [device('192.168.1.2', mac1)], baselineOptions)
    expect(appeared).toStrictEqual([])
    expect(devices.get(mac1)?.online).toBe(true)
  })

  it('applySweep B announces a new device once, then keeps its name', () => {
    const first = applySweep(new Map(), [device('192.168.1.2', mac1)], baselineOptions)
    const second = applySweep(first.devices, [device('192.168.1.2', mac1), { ...device('192.168.1.9', mac2), name: 'Phone' }], { baseline: false, nowMs: 2000 })
    expect(second.appeared.map(item => item.mac)).toStrictEqual([mac2])
    const third = applySweep(second.devices, [device('192.168.1.9', mac2)], { baseline: false, nowMs: 3000 })
    expect(third.appeared).toStrictEqual([])
    expect(third.devices.get(mac2)?.name).toBe('Phone')
  })

  it('applySweep F keeps the names and the ports found by an earlier sweep', () => {
    const ports = { open: ['ssh'] }
    const first = applySweep(new Map(), [{ ...device('192.168.1.2', mac1), name: 'Phone', names: { mdns: 'Phone' }, ports }], baselineOptions)
    const second = applySweep(first.devices, [device('192.168.1.2', mac1)], { baseline: false, nowMs: 2000 })
    expect(second.devices.get(mac1)?.names).toStrictEqual({ mdns: 'Phone' })
    expect(second.devices.get(mac1)?.ports).toStrictEqual(ports)
  })

  it('bestName A prefers mdns, then netbios, then dns, then the hostname', () => {
    expect(bestName({ dns: 'd', hostname: 'h', mdns: 'm', netbios: 'n' })).toBe('m')
    expect(bestName({ dns: 'd', hostname: 'h', netbios: 'n' })).toBe('n')
    expect(bestName({ dns: 'd', hostname: 'h' })).toBe('d')
    expect(bestName({ hostname: 'h' })).toBe('h')
    expect(bestName(undefined)).toBeUndefined()
  })

  it('buildHints A shows nothing when there is nothing to add', () => {
    expect(buildHints(device('192.168.1.2', mac1), { label: 'label' })).toBe('-')
  })

  it('buildHints B concatenates the vendor, names, open ports and tracking missing from the table', () => {
    const found = { ...device('192.168.1.2', 'DAA119000000'), appearedLater: true, missed: 2, names: { dns: 'phone.lan', mdns: 'Phone' }, ports: { open: ['ssh', 'https'] } }
    expect(buildHints(found, { label: 'Phone (Acme)', vendor: 'Acme Corp' })).toBe('vendor: Acme Corp | dns: phone.lan | open: ssh, https | random mac | missed: 2 | appeared later')
    expect(buildHints(found, { label: 'Phone phone.lan (Acme Corp)', vendor: 'Acme Corp' })).toBe('open: ssh, https | random mac | missed: 2 | appeared later')
  })

  it('applySweep E flags the devices that were not there at the first scan', () => {
    const first = applySweep(new Map(), [device('192.168.1.2', mac1)], baselineOptions)
    const second = applySweep(first.devices, [device('192.168.1.2', mac1), device('192.168.1.9', mac2)], { baseline: false, nowMs: 2000 })
    expect(second.devices.get(mac1)?.appearedLater).toBe(false)
    expect(second.devices.get(mac2)?.appearedLater).toBe(true)
    const third = applySweep(second.devices, [device('192.168.1.9', mac2)], { baseline: false, nowMs: 3000 })
    expect(third.devices.get(mac2)?.appearedLater).toBe(true)
  })

  it('applySweep D shows a missing device as absent at once and keeps the last response time only while present', () => {
    const first = applySweep(new Map(), [{ ...device('192.168.1.2', mac1), responseMs: 3.2 }], baselineOptions)
    expect(first.devices.get(mac1)).toMatchObject({ present: true, responseMs: 3.2 })
    const second = applySweep(first.devices, [], { baseline: false, nowMs: 2000 })
    expect(second.devices.get(mac1)).toMatchObject({ online: true, present: false, responseMs: undefined })
  })

  it('applySweep C marks a device offline after several missed sweeps and ignores flapping', () => {
    let state = applySweep(new Map(), [device('192.168.1.2', mac1)], baselineOptions).devices
    for (let index = 1; index <= config.maxMissedSweeps; index += 1) {
      state = applySweep(state, [], { baseline: false, nowMs: 1000 * (index + 1) }).devices
      expect(state.get(mac1)?.online).toBe(index < config.maxMissedSweeps)
    }
    expect(state.get(mac1)?.online).toBe(false)
    const back = applySweep(state, [device('192.168.1.2', mac1)], { baseline: false, nowMs: 10_000 })
    expect(back.appeared).toHaveLength(1)
    const offlineAgain = applySweep(applySweep(back.devices, [], { baseline: false, nowMs: 11_000 }).devices, [device('192.168.1.2', mac1)], { baseline: false, nowMs: 12_000 })
    expect(offlineAgain.appeared).toHaveLength(0)
    const later = applySweep(new Map([[mac1, { ...tracked('192.168.1.2', mac1, false), lastNotifiedAt: 10_000 }]]), [device('192.168.1.2', mac1)], { baseline: false, nowMs: 10_000 + config.notifyCooldownMs })
    expect(later.appeared).toHaveLength(1)
  })

  it('compareByIp A sorts numerically', () => {
    expect([device('192.168.1.10', mac1), device('192.168.1.9', mac2)].toSorted(compareByIp).map(item => item.ip)).toStrictEqual(['192.168.1.9', '192.168.1.10'])
  })
})

const message = { body: 'b', title: 't' }

describe('net-scan notifications', () => {
  it('describeAppeared A lists devices', () => {
    const { body, title } = describeAppeared([device('192.168.1.2', mac1), device('192.168.1.3', mac2)], labelOf)
    expect(title).toBe('New device on the network')
    expect(body).toBe('192.168.1.2 label 192.168.1.2\n192.168.1.3 label 192.168.1.3')
  })

  it('describeAppeared B summarizes many devices', () => {
    const many = ['1', '2', '3', '4'].map(suffix => device(`192.168.1.${suffix}`, mac1))
    const { body, title } = describeAppeared(many, labelOf)
    expect(title).toBe('4 new devices on the network')
    expect(body).toBe('192.168.1.1, 192.168.1.2, 192.168.1.3, 192.168.1.4')
  })

  it('buildNotificationCommands A gives argument arrays, hostile names stay data', () => {
    const commands = buildNotificationCommands({ environment: { DISPLAY: ':0' }, platform: 'linux' }, { body: '$(rm -rf /)\n`x` "y" ; -h', title: 'Title' })
    expect(commands).toStrictEqual([{ args: ['--app-name=net-scan', '--', 'Title', '$(rm -rf /) `x` "y" ; -h'], command: 'notify-send' }])
  })

  it('buildNotificationCommands B returns nothing without desktop or on other platforms', () => {
    expect(buildNotificationCommands({ environment: {}, platform: 'linux' }, message)).toStrictEqual([])
    expect(buildNotificationCommands({ environment: { DISPLAY: ':0' }, platform: 'win32' }, message)).toStrictEqual([])
    expect(buildNotificationCommands({ environment: { WAYLAND_DISPLAY: 'wayland-0' }, platform: 'linux' }, message)).toHaveLength(1)
  })
})

describe('net-scan keys', () => {
  const devices = [tracked('192.168.1.1', mac1), tracked('192.168.1.2', mac2)]
  const press = (ui: Ui, key: object) => handleKey({ devices, isKnown: () => true, labelOf, ui }, key)
  const editing = (text: string, cursor = text.length): Ui => ({ edit: { cursor, text }, selectedMac: mac2 })

  it('handleKey A quits with ctrl+c or q', () => {
    expect(press({}, { ctrl: true, name: 'c' }).quit).toBe(true)
    expect(press(editing('x'), { ctrl: true, name: 'c' }).quit).toBe(true)
    expect(press({}, { name: 'q' }).quit).toBe(true)
  })

  it('handleKey K asks to toggle the hints only while browsing', () => {
    expect(press({}, { name: 'h' }).toggleHints).toBe(true)
    expect(press(editing('Tv'), { name: 'h', sequence: 'h' }).toggleHints).toBeUndefined()
    expect(press(editing('Tv'), { name: 'h', sequence: 'h' }).ui.edit?.text).toBe('Tvh')
  })

  it('handleKey L asks to toggle the network only while browsing', () => {
    expect(press({}, { name: 'n' }).toggleNetwork).toBe(true)
    expect(press(editing('Tv'), { name: 'n', sequence: 'n' }).toggleNetwork).toBeUndefined()
    expect(press(editing('Tv'), { name: 'n', sequence: 'n' }).ui.edit?.text).toBe('Tvn')
  })

  it('handleKey J asks to toggle the live mode only while browsing', () => {
    expect(press({}, { name: 'l' }).toggleLive).toBe(true)
    expect(press(editing('Tv'), { name: 'l', sequence: 'l' }).toggleLive).toBeUndefined()
    expect(press(editing('Tv'), { name: 'l', sequence: 'l' }).ui.edit?.text).toBe('Tvl')
  })

  it('handleKey B moves the selection with wrap, keyed by mac', () => {
    expect(press({}, { name: 'down' }).ui.selectedMac).toBe(mac1)
    expect(press({ selectedMac: mac1 }, { name: 'down' }).ui.selectedMac).toBe(mac2)
    expect(press({ selectedMac: mac2 }, { name: 'down' }).ui.selectedMac).toBe(mac1)
    expect(press({ selectedMac: mac1 }, { name: 'up' }).ui.selectedMac).toBe(mac2)
    expect(handleKey({ devices: [], isKnown: () => true, labelOf, ui: {} }, { name: 'down' }).ui).toStrictEqual({})
  })

  it('handleKey C ignores other keys while browsing', () => {
    const ui = { selectedMac: mac1 }
    expect(press(ui, { name: 'x' }).ui).toBe(ui)
    expect(press({}, { name: 'return' }).ui).toStrictEqual({})
  })

  it('handleKey D starts the edition with the label', () => {
    expect(press({ selectedMac: mac2 }, { name: 'return' }).ui.edit).toStrictEqual({ cursor: 'label 192.168.1.2'.length, text: 'label 192.168.1.2' })
  })

  it('handleKey E saves or cancels the edition', () => {
    expect(press(editing('Router'), { name: 'return' }).save).toStrictEqual({ label: 'Router', mac: mac2 })
    expect(press(editing('Router'), { name: 'return' }).ui).toStrictEqual({ selectedMac: mac2 })
    expect(press(editing('  '), { name: 'return' }).save).toBeUndefined()
    expect(press(editing('Router'), { name: 'escape' })).toStrictEqual({ ui: { selectedMac: mac2 } })
    expect(press({ edit: { cursor: 0, text: 'x' }, selectedMac: 'UNKNOWN' }, { name: 'return' }).save).toBeUndefined()
  })

  it('handleKey F moves the cursor', () => {
    expect(press(editing('abc'), { name: 'left' }).ui.edit?.cursor).toBe(2)
    expect(press(editing('abc', 0), { name: 'left' }).ui.edit?.cursor).toBe(0)
    expect(press(editing('abc', 1), { name: 'right' }).ui.edit?.cursor).toBe(2)
    expect(press(editing('abc'), { name: 'right' }).ui.edit?.cursor).toBe(3)
    expect(press(editing('abc'), { name: 'home' }).ui.edit?.cursor).toBe(0)
    expect(press(editing('abc', 0), { name: 'end' }).ui.edit?.cursor).toBe(3)
  })

  it('handleKey G deletes chars', () => {
    expect(press(editing('abc'), { name: 'backspace' }).ui.edit).toStrictEqual({ cursor: 2, text: 'ab' })
    const start = editing('abc', 0)
    expect(press(start, { name: 'backspace' }).ui).toBe(start)
    expect(press(start, { name: 'delete' }).ui.edit).toStrictEqual({ cursor: 0, text: 'bc' })
  })

  it('handleKey I types spaces and stops at the max length', () => {
    expect(press(editing('Tv'), { name: 'space', sequence: ' ' }).ui.edit).toStrictEqual({ cursor: 3, text: 'Tv ' })
    const full = editing('a'.repeat(config.maxTextLength))
    expect(press(full, { name: 'b', sequence: 'b' }).ui).toBe(full)
  })

  it('handleKey H inserts typed or pasted text, ignoring control chars', () => {
    expect(press(editing('ac', 1), { name: 'b', sequence: 'b' }).ui.edit).toStrictEqual({ cursor: 2, text: 'abc' })
    expect(press(editing('a'), { sequence: ' pasted\n' }).ui.edit).toStrictEqual({ cursor: 8, text: 'a pasted' })
    const ui = editing('a')
    expect(press(ui, { ctrl: true, name: 'x', sequence: '\u0018' }).ui).toBe(ui)
    expect(press(ui, { name: 'f1', sequence: '\u001BOP' }).ui).toBe(ui)
    expect(press(ui, { name: 'x' }).ui).toBe(ui)
  })
})

describe('net-scan report', () => {
  const known = new Set([mac1])
  const isKnown = (item: FoundDevice) => known.has(item.mac)

  it('formatProgress A draws a bar, a plain label or nothing', () => {
    expect(formatProgress(undefined)).toBe('')
    expect(formatProgress({ label: 'asking 254 addresses', ratio: 0.5 })).toBe('[##########----------] 50% asking 254 addresses')
    expect(formatProgress({ label: 'oops', ratio: 3 })).toContain('[####################] 300%')
    expect(formatProgress({ label: 'oops', ratio: -1 })).toContain('[--------------------]')
    expect(formatProgress({ label: 'next scan in 5s' })).toContain('next scan in 5s')
  })

  it('classifyDevice A lets ??? override the storage', () => {
    const view = { devices: [], isKnown, labelOf: (item: FoundDevice) => (item.ip === '192.168.1.3' ? '??? (NETGEAR)' : `label ${item.ip}`), ui: {} }
    expect(classifyDevice(view, device('192.168.1.1', mac1))).toBe('known')
    expect(classifyDevice(view, device('192.168.1.2', mac2))).toBe('new')
    expect(classifyDevice(view, device('192.168.1.3', mac2))).toBe('unknown')
    expect(classifyDevice(view, device('192.168.1.3', mac1))).toBe('unknown')
    expect(classifyDevice(view, { ...device('192.168.1.1', mac1), appearedLater: true })).toBe('new')
  })

  it('formatReport A lays out title, table, progress and legend like the target screen', () => {
    const progress = { label: 'next scan in 23s' }
    const lines = formatReport({ devices: [tracked('192.168.1.1', mac1), tracked('192.168.1.2', mac2)], isKnown, labelOf, progress, ui: { selectedMac: mac1 }, width: 70 })
    expect(lines[0]).toBe('')
    expect(lines[1]).toContain('  ')
    expect(lines[1]).toContain('Net Scan : 1 known devices, 1 new, 0 unknown')
    expect(lines[2]).toBe('')
    expect(lines[3]).toContain('response')
    expect(lines[3]).toContain('name')
    expect(lines[3]).not.toContain('hints')
    expect(lines[4]).toBe('')
    expect(lines[5]).toContain('> 192.168.1.1')
    expect(lines[5]).toContain('  -')
    expect(lines[6]).toContain('  192.168.1.2')
    expect(lines[6]).toContain('label 192.168.1.2')
    expect(lines[7]).toBe('')
    expect(stripVTControlCharacters(lines[8] ?? '')).toBe('  next scan in 23s')
    expect(lines[9]).toBe('')
    expect(lines).toHaveLength(11)
  })

  it('formatReport G leaves the progress line empty when there is nothing to tell', () => {
    expect(formatReport({ devices: [], isKnown, labelOf, ui: {} }).at(-3)).toBe('')
  })

  it('legendItems A gives the live mode and hints states, and the edition keys', () => {
    expect(legendItems({ devices: [], isKnown, isLive: true, labelOf, showHints: true, showNetwork: true, ui: {} })).toStrictEqual([
      { key: '↑↓', text: 'select' },
      { key: '↵', text: 'rename' },
      { key: 'l', text: 'live on' },
      { key: 'h', text: 'hints on' },
      { key: 'n', text: 'network on' },
      { key: 'q', text: 'quit' },
    ])
    expect(legendItems({ devices: [], isKnown, labelOf, ui: {} })[3]?.text).toBe('hints off')
    expect(legendItems({ devices: [], isKnown, labelOf, ui: {} })[4]?.text).toBe('network off')
    expect(legendItems({ devices: [], isKnown, labelOf, ui: {} })[2]?.text).toBe('live off')
    const editing = legendItems({ devices: [], isKnown, labelOf, ui: { edit: { cursor: 0, text: '' } } })
    expect(editing).toHaveLength(4)
    expect(editing.at(-1)).toStrictEqual({ key: 'esc', text: 'cancel' })
  })

  it('spreadLegend A spaces the legends evenly from edge to edge', () => {
    const items = [
      { key: 'a', text: 'bb' },
      { key: 'c', text: 'dd' },
      { key: 'e', text: 'ff' },
      { key: 'g', text: 'hh' },
    ]
    const row = stripVTControlCharacters(spreadLegend(items, 40))
    expect(row).toHaveLength(38)
    expect(row.startsWith('  a bb')).toBe(true)
    expect(row.endsWith('g hh')).toBe(true)
    const gaps = [...row.matchAll(/ +/gu)]
      .map(match => match[0].length)
      .filter(length => length > 1)
      .slice(1)
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1)
  })

  it('spreadLegend B keeps a minimal gap when the terminal is too narrow', () => {
    const items = [
      { key: 'a', text: 'bb' },
      { key: 'c', text: 'dd' },
    ]
    expect(stripVTControlCharacters(spreadLegend(items, 5))).toBe('  a bb  c dd')
  })

  it('formatTable B shows the hints column only when asked', () => {
    const found = { ...tracked('192.168.1.1', mac1), ports: { open: ['ssh'] } }
    const hidden = formatTable({ devices: [found], isKnown, labelOf, ui: {} })
    expect(hidden[0]).not.toContain('hints')
    expect(hidden[2]).not.toContain('open: ssh')
    const shown = formatTable({ devices: [found], isKnown, labelOf, showHints: true, ui: {} })
    expect(shown[0]).toContain('hints')
    expect(shown[2]).toContain('open: ssh')
  })

  it('formatTable C shows the network column only when asked', () => {
    const hidden = formatTable({ devices: [tracked('192.168.1.1', mac1)], isKnown, labelOf, ui: {} })
    expect(hidden[0]).not.toContain('network')
    expect(hidden[2]).not.toContain('eth0')
    const shown = formatTable({ devices: [tracked('192.168.1.1', mac1)], isKnown, labelOf, showNetwork: true, ui: {} })
    expect(shown[0]).toContain('network')
    expect(shown[2]).toContain('eth0')
  })

  it('ellipsize A cuts a text with an ellipsis only when it is too long', () => {
    expect(ellipsize('abcdef', 6)).toBe('abcdef')
    expect(ellipsize('abcdef', 5)).toBe('abcd…')
    expect(ellipsize('abcdef', 1)).toBe('…')
    expect(ellipsize('abcdef', 0)).toBe('')
  })

  it('formatTable D shortens the name with an ellipsis instead of overflowing the terminal width', () => {
    const lines = formatTable({ devices: [tracked('192.168.1.1', mac1)], isKnown, labelOf: longLabel, ui: {}, width: 60 })
    const row = stripVTControlCharacters(lines[2] ?? '')
    expect(row).toHaveLength(60)
    expect(row).toContain('…')
    expect(row.endsWith('…')).toBe(true)
    const wide = stripVTControlCharacters(formatTable({ devices: [tracked('192.168.1.1', mac1)], isKnown, labelOf: longLabel, ui: {}, width: 200 })[2] ?? '')
    expect(wide).toContain('(Vendor Inc.)')
    expect(wide).not.toContain('…')
  })

  it('formatTable E gives the hints what the name leaves and keeps the cursor visible while editing', () => {
    const found = { ...tracked('192.168.1.1', mac1), ports: { open: ['ssh', 'https', 'smb', 'http', 'rtsp', 'mqtt'] } }
    const row = formatTable({ devices: [found], isKnown, labelOf, showHints: true, ui: {}, width: 70 }).at(2)
    expect(stripVTControlCharacters(row ?? '').length).toBeLessThanOrEqual(70)
    expect(row).toContain('…')
    const text = 'x'.repeat(60)
    const editing = formatTable({ devices: [tracked('192.168.1.1', mac1)], isKnown, labelOf, ui: { edit: { cursor: 60, text }, selectedMac: mac1 }, width: 60 })
    expect(stripVTControlCharacters(editing[2] ?? '')).toContain('…xx')
    expect(stripVTControlCharacters(editing[2] ?? '').endsWith('|')).toBe(true)
  })

  it('formatTable A gives the header then a row per device', () => {
    const lines = formatTable({ devices: [tracked('192.168.1.1', mac1)], isKnown, labelOf, ui: {} })
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('')
    expect(lines[2]).toContain('192.168.1.1')
  })

  it('formatReport D counts known, new and unknown devices', () => {
    const labels = new Map([['192.168.1.3', '??? (NETGEAR)']])
    const devices = [tracked('192.168.1.1', mac1), tracked('192.168.1.2', mac2), tracked('192.168.1.3', 'AA0000000003')]
    const lines = formatReport({ devices, isKnown, labelOf: item => labels.get(item.ip) ?? `label ${item.ip}`, ui: {} })
    expect(lines[1]).toContain('1 known devices, 1 new, 1 unknown')
  })

  it('formatReport E keeps an offline unknown device yellow and dims other offline devices', () => {
    const labels = new Map([['192.168.1.3', '??? (NETGEAR)']])
    const devices = [tracked('192.168.1.3', 'AA0000000003', false), tracked('192.168.1.1', mac1, false)]
    const lines = formatReport({ devices, isKnown, labelOf: item => labels.get(item.ip) ?? `label ${item.ip}`, ui: {} })
    const [yellowOpen] = yellow('x').split('x')
    const [dimOpen] = dim('x').split('x')
    expect(lines[5]?.startsWith(`${yellowOpen}${dimOpen}`)).toBe(true)
    expect(lines[6]?.startsWith(dimOpen ?? '')).toBe(true)
    expect(lines[6]?.startsWith(yellowOpen ?? '')).toBe(false)
  })

  it('formatReport B shows the edition, tags, new and offline devices', () => {
    const offline = tracked('192.168.1.3', 'DAA119000000', false)
    const lines = formatReport({ devices: [tracked('192.168.1.1', mac1), tracked('192.168.1.2', mac2), offline], isKnown, labelOf, showHints: true, ui: { edit: { cursor: 2, text: 'Router' }, selectedMac: mac2 } })
    expect(lines[6]).toContain('Ro|uter')
    expect(lines[7]).toContain('random mac')
    expect(lines[7]).toContain('offline')
    expect(lines.at(-1)).toContain('cancel')
  })

  it('formatReport C selects a known device and a new device', () => {
    const known1 = formatReport({ devices: [tracked('192.168.1.1', mac1)], isKnown, labelOf, ui: { selectedMac: mac1 } }).at(5)
    const new1 = formatReport({ devices: [tracked('192.168.1.2', mac2)], isKnown, labelOf, ui: { selectedMac: mac2 } }).at(5)
    invariant(known1 && new1, 'rows should exist')
    expect(known1).toContain('> 192.168.1.1')
    expect(new1).toContain('> 192.168.1.2')
  })
})
