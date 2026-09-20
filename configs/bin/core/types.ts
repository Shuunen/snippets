/* v8 ignore start */

/** which of the two files a piece of content belongs to : the backup in this repo, or the live one on this machine */
export type Side = 'local' | 'repo'

/** the two sides, in the order they are drawn on screen (repo on the left, local on the right) */
export const sides: Side[] = ['repo', 'local']

/** a value held once per side */
export type BySide<Value> = Record<Side, Value>

export type NoiseFilters = {
  /** a list of regex : a conflicting block whose enclosing `[Header]` section matches any of them is excluded from the merge */ removeBlocksMatching?: RegExp[]
  /** a regex to remove lines after */ removeLinesAfter?: RegExp
  /** a list of regex to remove lines matching */ removeLinesMatching?: RegExp[]
}

export type FileDetails = {
  /** the file content */ content: string
  /** the file path */ filepath: string
  /** whether the file exists */ isExisting: boolean
  /** when the file was last modified on disk, undefined if it doesn't exist */ modifiedAt?: Date
}

export type SyncFile = {
  /** true if the two sides hold no conflicting block worth asking about */ areEquals: boolean
  /** the noise filters this file was configured with */ filters: NoiseFilters
  /** each side's file details */ sides: BySide<FileDetails>
}

export type Config = NoiseFilters & {
  /** the live file path on this machine */ local: string
  /** the backup file name in this repo, when it should differ from the live file's basename */ renameTo?: string
}

export type Report = {
  errors: string[]
  infos: string[]
  success: string[]
  suggestions: string[]
  warnings: string[]
}
