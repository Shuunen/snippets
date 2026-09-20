import { invariant } from 'es-toolkit'

/**
 * Read an array slot that is known to be in bounds, failing loudly rather than silently yielding undefined
 * @param items the array to read from
 * @param index the in-bounds index
 * @returns the item at that index
 */
export function at<Item>(items: Item[], index: number): Item {
  const item = items[index]
  invariant(item !== undefined, `index ${index} should be within the ${items.length} available items`)
  return item
}

/**
 * This machine's home directory, or an empty string when the environment doesn't say
 * @returns the home directory path
 */
export function homeDir(): string {
  return process.env.HOME ?? ''
}
