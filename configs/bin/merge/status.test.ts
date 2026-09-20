import type { FileDetails, SyncFile } from '../core/types'
import { buildBoxFooter, paneStatusLine } from './status'
import { stripAnsi } from './text'

const details = (filepath: string, content: string, modifiedAt?: Date): FileDetails => ({ content, filepath, isExisting: true, modifiedAt })

const file: SyncFile = {
  areEquals: false,
  filters: {},
  sides: { local: details('/home/me/.bashrc', 'a\nb\nc\n', new Date()), repo: details('/repo/files/.bashrc', 'a\nb\n', new Date()) },
}

describe('merge status', () => {
  it('paneStatusLine reports encoding, filetype, line count and modification date', () => {
    const line = paneStatusLine(details('/home/me/.bashrc', 'a\nb\n', new Date()), 'bash', 80)
    expect(line).toContain('utf8')
    expect(line).toContain('bash')
    expect(line).toContain('2 lines')
  })

  it('paneStatusLine says plain when no language was guessed, and keeps line singular for one line', () => {
    const oneLine = details('/home/me/thing', 'a\n', new Date())
    expect(paneStatusLine(oneLine, undefined, 80)).toContain('plain')
    expect(paneStatusLine(oneLine, undefined, 80)).toContain('1 line ')
  })

  it('paneStatusLine says so when the file does not exist yet', () => {
    const missing = details('/home/me/thing', '')
    expect(paneStatusLine(missing, undefined, 80)).toContain('not created yet')
  })

  it('paneStatusLine truncates to the pane width', () => {
    const long = details('/home/me/.bashrc', 'a\n', new Date())
    expect(paneStatusLine(long, 'bash', 12)).toHaveLength(12)
  })

  it('buildBoxFooter draws both bottom borders, both status lines, and a trailing blank line', () => {
    const [borders, status, blank] = buildBoxFooter(file, { local: 30, repo: 30 })
    expect(borders).toHaveLength(30 + 2 + 2 + 30 + 2)
    expect(stripAnsi(status ?? '')).toHaveLength(borders?.length ?? 0)
    expect(stripAnsi(status ?? '')).toContain('bash')
    expect(blank).toBe('')
  })

  it('buildBoxFooter shows each side its own line count', () => {
    const status = stripAnsi(buildBoxFooter(file, { local: 60, repo: 60 })[1] ?? '')
    expect(status).toContain('2 lines')
    expect(status).toContain('3 lines')
  })
})
