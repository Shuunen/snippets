/* eslint-disable spaced-comment */
/* eslint-disable multiline-comment-style */
/**
  @typedef FileDetails
  @type {Object}
  @property {string} filepath the file path
  @property {boolean} exists whether the file exists
  @property {string} content the file content
 */

/**
  @typedef File
  @type {Object}
  @property {FileDetails} source the source file details
  @property {FileDetails} destination the destination file details
  @property {boolean} equals true if the source and destination files are the same
  @property {RegExp | undefined} [removeLinesAfter] a regex to remove lines after
  @property {RegExp[] | undefined} [removeLinesMatching] a list of regex to remove lines matching
 */

/**
  @typedef Config
  @type {Object}
  @property {string} source the source file path
  @property {string} [renameTo] the destination file path in this repo
  @property {RegExp} [removeLinesAfter] a regex to remove lines after
  @property {RegExp[]} [removeLinesMatching] a list of regex to remove lines matching
**/

/**
  @typedef Report
  @type {Object}
  @property {string[]} errors the list of errors
  @property {string[]} warnings the list of warnings
  @property {string[]} infos the list of infos
  @property {string[]} success the list of successes
  @property {string[]} suggestions the list of suggestions
**/

export const age = 42 // the answer to life, the universe and everything, and to a weird bug if this is not here
