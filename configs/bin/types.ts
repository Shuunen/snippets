/* eslint-disable @typescript-eslint/naming-convention */

export type FileDetails = {
  /** the file path */ filepath: string
  /** whether the file exists */ exists: boolean
  /** the file content */ content: string
}

export type File = {
  /** the source file details */ source: FileDetails
  /** the destination file details */ destination: FileDetails
  /** true if the source and destination files are the same */ equals: boolean
  /** a regex to remove lines after */ removeLinesAfter?: RegExp
  /** a list of regex to remove lines matching */ removeLinesMatching?: RegExp[]
}


export type Config = {
  /** the source file path */ source: string
  /** the destination file path in this repo */ renameTo?: string
  /** a regex to remove lines after */ removeLinesAfter?: RegExp
  /** a list of regex to remove lines matching */ removeLinesMatching?: RegExp[]
}

export type Report = {
  errors: string[]
  warnings: string[]
  infos: string[]
  success: string[]
  suggestions: string[]
}
