/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Logger } from 'shuutils'

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
  const replaced = string.replace(regex, `$<before>${replacement}$<after>`)
  if (replaced === string) logger.error(`Could not replace ${String(regex)} with ${replacement}`)
  return replaced
}

/**
 * Replace a placeholder in a string and check if it was replaced via an identifier
 * @param string The string to replace in
 * @param id The identifier to replace
 * @param replacement The replacement
 * @returns The replaced string
 */
export function replaceAndCheckById (string: string, id: string, replacement: string): string {
  // /(?<before>id="projectName"[^>]+>)(?<content>[^<]+)(?<after><\/)/gu
  const regex = new RegExp(`(?<before>id="${id}"[^>]+>)(?<content>[^<]+)(?<after><\/)`, 'gu')
  return replaceAndCheck(string, regex, replacement)
}
