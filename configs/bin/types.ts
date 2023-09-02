/* eslint-disable @typescript-eslint/naming-convention */

export type FileDetails = {
  /** the file content */ content: string
  /** whether the file exists */ exists: boolean
  /** the file path */ filepath: string
}

export type File = {
  /** the destination file details */ destination: FileDetails
  /** true if the source and destination files are the same */ equals: boolean
  /** a regex to remove lines after */ removeLinesAfter?: RegExp
  /** a list of regex to remove lines matching */ removeLinesMatching?: RegExp[]
  /** the source file details */ source: FileDetails
}


export type Config = {
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
