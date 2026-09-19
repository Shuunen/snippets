/* v8 ignore start */
import { once } from 'node:events'
import { emitKeypressEvents } from 'node:readline'
import { invariant } from 'es-toolkit'
import type { ParsedKey } from './merge-logic.node'

export type KeypressEvent = { key: ParsedKey; kind: 'keypress' }

export type ResizeEvent = { kind: 'resize' }

/**
 * Turn on raw keypress mode on stdin, run the callback, then always turn it back off
 * @param run the callback to run while raw mode is on
 * @returns the callback's result
 */
export async function withRawKeypresses<Outcome>(run: () => Promise<Outcome>): Promise<Outcome> {
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode?.(true)
  process.stdin.resume()
  try {
    return await run()
  } finally {
    process.stdin.setRawMode?.(false)
    process.stdin.pause()
  }
}

/**
 * Wait for the next keypress, resolving with undefined instead of throwing if aborted first
 * @param signal used to cancel the wait once the other race branch wins
 * @returns the keypress event, or undefined if aborted
 */
async function nextKeypress(signal: AbortSignal): Promise<KeypressEvent | undefined> {
  try {
    const [, key] = await once(process.stdin, 'keypress', { signal })
    return { key: key as ParsedKey, kind: 'keypress' }
  } catch {
    return undefined
  }
}

/**
 * Wait for the next terminal resize, resolving with undefined instead of throwing if aborted first
 * @param signal used to cancel the wait once the other race branch wins
 * @returns the resize event, or undefined if aborted
 */
async function nextResize(signal: AbortSignal): Promise<ResizeEvent | undefined> {
  try {
    await once(process.stdout, 'resize', { signal })
    return { kind: 'resize' }
  } catch {
    return undefined
  }
}

/**
 * Wait for either a keypress or a terminal resize, whichever happens first
 * @returns the event that happened
 */
export async function waitForKeypressOrResize(): Promise<KeypressEvent | ResizeEvent> {
  const controller = new AbortController()
  try {
    const event = await Promise.race([nextKeypress(controller.signal), nextResize(controller.signal)])
    invariant(event, 'the race winner should never resolve as aborted')
    return event
  } finally {
    controller.abort()
  }
}
