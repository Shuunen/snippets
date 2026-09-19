import { copyFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { Logger, Result } from 'shuutils'

const regexes = {
  carriageReturn: /\r\n/gu,
  clearSpaces: /\s*/gu,
  filename: /[/\\](?<name>[\w.-]+)$/u,
}

export const logger = new Logger()

/**
 * Get the filename from a filepath
 * @param filepath the filepath to get the filename from
 * @returns the filename
 * @example filename('C:\\Users\\me\\file.txt') // 'file.txt'
 */
export function filename(filepath = ''): string {
  return regexes.filename.exec(filepath)?.groups?.name ?? ''
}

/**
 * Remove lines matching a regexp list
 * @param content the content to clean
 * @param regexList the regex list to match
 * @returns the cleaned content
 */
export function removeLinesMatching(content: string, regexList: RegExp[]): string {
  const lines = content.split('\n')
  const filteredLines = lines.filter(line => !regexList.some(regex => regex.test(line)))
  return filteredLines.join('\n').trim()
}

/**
 * Remove lines after a given regex
 * @param content the content to remove lines from
 * @param regex the regexp to match the line after which to remove content
 * @returns the content without the lines after the matching line
 */
export function removeLinesAfter(content: string, regex: RegExp): string {
  const lines = content.split('\n')
  const index = lines.findIndex(line => regex.test(line))
  if (index === -1) return content.trim()
  return lines.slice(0, index).join('\n').trim()
}

/**
 * Convert carriage return to unix line endings
 * @param content the content to be processed
 * @returns the processed content with unix line endings
 */
export function useUnixCarriageReturn(content: string): string {
  return content.replace(regexes.carriageReturn, '\n')
}

/**
 * Clean a file details content
 * @param content the file content to clean
 * @param linesAfter a regex to remove lines after
 * @param linesMatching a list of regex to remove lines matching
 * @param shouldClearSpaces if true will also clear spaces
 * @returns the cleaned file content
 */
// oxlint-disable-next-line max-params
export function clean(content: string, linesAfter?: RegExp, linesMatching?: RegExp[], shouldClearSpaces = true): string {
  if (!content) return ''
  let output = content
  /* v8 ignore if */
  if (linesAfter) output = removeLinesAfter(output, linesAfter)
  /* v8 ignore if */
  if (linesMatching) output = removeLinesMatching(output, linesMatching)
  /* v8 ignore if */
  if (shouldClearSpaces) output = output.replace(regexes.clearSpaces, '')
  return output
}

/**
 * Normalize a filepath with slash style
 * @param filepath the filepath
 * @param shouldUseTilde use tilde will replace the home directory with ~
 * @param home the home directory path
 * @returns the normalized path
 */
/* v8 ignore next */
export function normalizePathWithSlash(filepath: string, shouldUseTilde = false, home = process.env.HOME ?? ''): string {
  let outPath = path.normalize(filepath).replaceAll('\\', '/')
  if (shouldUseTilde) outPath = outPath.replace(normalizePathWithSlash(home), '~')
  return outPath
}

/**
 * Copy a file
 * @param source the source file
 * @param destination the destination file
 * @returns some bool result; i don't know im in the train to Paris
 */
/* v8 ignore next */
export async function copy(source: string, destination: string): Promise<boolean> {
  // destination will be created or overwritten by default.
  const destinationFolder = destination.replace(filename(destination), '')
  await mkdir(destinationFolder, { recursive: true })
  const result = Result.trySafe(() => copyFileSync(source, destination))
  if (!result.ok) {
    logger.error(result.error)
    return false
  }
  return true
}
