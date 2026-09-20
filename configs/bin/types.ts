/* v8 ignore start */

export type FileDetails = {
  /** the file content */ content: string
  /** the file path */ filepath: string
  /** whether the file exists */ isExisting: boolean
  /** when the file was last modified on disk, undefined if it doesn't exist */ modifiedAt?: Date
}

export type File = {
  /** true if the source and destination files are the same */ areEquals: boolean
  /** the destination file details */ destination: FileDetails
  /** a list of regex : a conflicting block matching any of them is excluded from the merge */ removeBlocksMatching?: RegExp[]
  /** a regex to remove lines after */ removeLinesAfter?: RegExp
  /** a list of regex to remove lines matching */ removeLinesMatching?: RegExp[]
  /** the source file details */ source: FileDetails
}

export type Config = {
  /** a list of regex : a conflicting block matching any of them is excluded from the merge */ removeBlocksMatching?: RegExp[]
  /** a regex to remove lines after */ removeLinesAfter?: RegExp
  /** a list of regex to remove lines matching */ removeLinesMatching?: RegExp[]
  /** the destination file path in this repo */ renameTo?: string
  /** the source file path */ source: string
}

export type Report = {
  errors: string[]
  infos: string[]
  success: string[]
  suggestions: string[]
  warnings: string[]
}
