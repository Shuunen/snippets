import { copyFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { Logger, Result } from 'shuutils'

const regexes = {
  carriageReturn: /\r\n/gu,
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
