/* eslint-disable @typescript-eslint/no-magic-numbers */

import { Logger } from 'shuutils'

/**
 * Calculate the filler length for the description
 * @param descLength The description length
 * @returns The filler length
 * @example descFillerLength(9) // 32
 * @example descFillerLength(14) // 27
 * @example descFillerLength(20) // 22
 * @example descFillerLength(23) // 21
 * @example descFillerLength(25) // 19
 * @example descFillerLength(32) // 13
 * @example descFillerLength(37) // 10
 * @example descFillerLength(41) // 6
 * @example descFillerLength(46) // 1
 */
function descFillerLength (descLength: number): number {
  if (descLength < 10) return 32
  if (descLength < 15) return 27
  if (descLength < 21) return 22
  if (descLength < 24) return 21
  if (descLength < 26) return 19
  if (descLength < 33) return 13
  if (descLength < 38) return 10
  if (descLength < 42) return 6
  if (descLength < 47) return 1
  return 0
}

/**
 * Get the filler for the description
 * @param description The description to fill
 * @returns The filler
 * @example descFiller('The description is kind of pretty !') // '..............................................'
 * @example descFiller('The description') // '.................................'
 */
export function descFiller (description: string): string {
  return '.'.repeat(descFillerLength(description.length))
}

/**
 * Get the filler for the name
 * @param name The name to fill
 * @returns The filler
 * @example nameFiller('name') // '............'
 */
export function nameFiller (name: string): string {
  return '.'.repeat(Math.max(0, 16 - name.length))
}

export const logger = new Logger()

/**
 * Replace a placeholder in a string and check if it was replaced
 * @param string The string to replace in
 * @param regex The regex to replace
 * @param replacement The replacement
 * @returns The replaced string
 * @example replaceAndCheck('Hello world !', /world/gu, 'there') // 'Hello there !'
 */
export function replaceAndCheck (string: string, regex: RegExp, replacement: string): string {
  const replaced = string.replace(regex, replacement)
  if (replaced === string) logger.error(`Could not replace ${String(regex)} with ${replacement}`)
  return replaced
}

