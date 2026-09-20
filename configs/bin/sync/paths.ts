import { copyFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { Result } from 'shuutils'
import { logger } from '../logger'
import { homeDir } from '../utils'

const regexes = {
  carriageReturn: /\r\n/gu,
  filename: /[/\\](?<name>[\w.-]+)$/u,
}

/**
 * Get the filename from a filepath, whichever slash style it uses
 * @param filepath the filepath to get the filename from
 * @returns the filename
 * @example filename('C:\\Users\\me\\file.txt') // 'file.txt'
 */
export function filename(filepath = ''): string {
  return regexes.filename.exec(filepath)?.groups?.name ?? ''
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
 * Normalize a filepath with slash style
 * @param filepath the filepath
 * @param shouldUseTilde use tilde will replace the home directory with ~
 * @param home the home directory path
 * @returns the normalized path
 */
export function normalizePathWithSlash(filepath: string, shouldUseTilde = false, home = homeDir()): string {
  const outPath = path.normalize(filepath).replaceAll('\\', '/')
  return shouldUseTilde ? outPath.replace(normalizePathWithSlash(home), '~') : outPath
}

/**
 * Copy a file, creating the destination folder if needed
 * @param source the source file
 * @param destination the destination file, created or overwritten
 * @returns true if the copy succeeded
 */
/* v8 ignore next */
export async function copy(source: string, destination: string): Promise<boolean> {
  await mkdir(path.dirname(destination), { recursive: true })
  const result = Result.trySafe(() => copyFileSync(source, destination))
  if (result.ok) return true
  logger.error(result.error)
  return false
}
