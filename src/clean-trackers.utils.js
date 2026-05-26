import { isolateLines, linesToList } from './isolate-lines.utils.js'

const trackersToClean = ['tr.ready4.icu', 'exodus.desync.com', 'tracker.auctor.tv']

/**
 * @param {string} line the line to check
 * @returns {boolean} true if the line is not a tracker
 */
function isNotTracker(line) {
  return trackersToClean.every(tracker => !line.includes(tracker))
}

/**
 * @param {string} input the list of trackers to clean
 * @returns {string} the cleaned list
 */
export function cleanTrackers(input) {
  const lines = isolateLines(input).filter(line => isNotTracker(line))
  return linesToList(lines)
}
