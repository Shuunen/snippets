import { isolateLines, linesToList } from './isolate-lines.utils.js'

const trackersToClean = [
  'tr.ready4.icu',
  'exodus.desync.com',
  'tracker.auctor.tv',
]

export function cleanTrackers (input: string) {
  const lines = isolateLines(input).filter(line => trackersToClean.every(tracker => !line.includes(tracker)))
  return linesToList(lines)
}
