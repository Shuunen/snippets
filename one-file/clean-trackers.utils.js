import { isolateLines, linesToList } from './isolate-lines.utils.js'

const trackersToClean = [
  'tr.ready4.icu',
  'exodus.desync.com',
  'tracker.auctor.tv',
]

/**
 * @param {string} input the list of trackers to clean
 */
export function cleanTrackers (input) {
  const lines = isolateLines(input).filter(line => trackersToClean.every(tracker => !line.includes(tracker)))
  return linesToList(lines)
}
