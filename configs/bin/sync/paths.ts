import { copyFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Result } from 'shuutils'
import { logger } from '../core/logger'
import { homeDir } from './catalog'

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

/**
 * Write content to a file without ever leaving it truncated : write to a sibling temp file first,
 * then atomically rename it into place, so a crash or interrupt mid-write can only ever leave the
 * previous, complete content behind
 * @param filepath the destination file
 * @param content the content to write
 */
/* v8 ignore next */
export async function writeAtomic(filepath: string, content: string): Promise<void> {
  const tempPath = `${filepath}.tmp-${process.pid}`
  await writeFile(tempPath, content)
  await rename(tempPath, filepath)
}
