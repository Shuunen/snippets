import { createReport, type RunSummary, summarize } from './report'

const summary = (overrides: Partial<RunSummary> = {}): RunSummary => ({ didMerge: false, hasRepoChanges: false, isPreview: false, outOfSyncPaths: [], ...overrides })

describe('sync report', () => {
  it('createReport starts every bucket empty', () => {
    expect(createReport()).toStrictEqual({ errors: [], infos: [], success: [], suggestions: [], warnings: [] })
  })

  it('summarize lists the commands to run for a preview run that found work', () => {
    const lines = summarize(summary({ isPreview: true, outOfSyncPaths: ['merge a b', 'merge c d'] }))
    expect(lines[0]).toContain('TODO')
    expect(lines[1]).toContain('merge a b')
    expect(lines[1]).toContain('merge c d')
  })

  it('summarize reports nothing to do for a preview run that found nothing', () => {
    expect(summarize(summary({ isPreview: true })).join('')).toContain('no actions required')
  })

  it('summarize asks for a review when merging changed a repo file', () => {
    expect(summarize(summary({ didMerge: true, hasRepoChanges: true })).join('')).toContain('review the changes in this repo')
  })

  it('summarize says there is nothing to review when merging left the repo alone', () => {
    expect(summarize(summary({ didMerge: true })).join('')).toContain('no changes to review')
  })

  it('summarize reports a quiet run when nothing was out of sync', () => {
    expect(summarize(summary()).join('')).toContain('no actions required')
  })
})
