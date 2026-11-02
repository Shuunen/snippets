#!/usr/bin/env bun
/* v8 ignore start */
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { cac } from 'cac'

const spaces = 2
const cli = cac('format-json')
cli.usage('<file or folder>').help()
const { args, options } = cli.parse()

/**
 * @param {string} filePath the filepath
 */
function formatFile(filePath) {
  const jsonIn = readFileSync(filePath, 'utf8')
  const jsonOut = `${JSON.stringify(JSON.parse(jsonIn), undefined, spaces)}\n`
  if (jsonIn !== jsonOut) writeFileSync(filePath, jsonOut)
}

/**
 * @param {string} folderPath the folder path
 * @returns the files
 */
function getFiles(folderPath) {
  const stats = lstatSync(folderPath)
  if (stats.isFile()) return [folderPath]
  if (!stats.isDirectory()) throw new Error('path must be a file or folder')
  return readdirSync(folderPath)
    .filter((/** @type {string} */ file) => file.includes('.json'))
    .map((/** @type {string} */ file) => path.join(folderPath, file))
}

/**
 * The path to format
 * @returns {string} the path
 */
function getPath() {
  if (args.length === 0) throw new Error(String.raw`this script need a path as argument like : format-json.js my-file.json or format-json.js "C:\My Folder\"`)
  return path.normalize(args[0] ?? '')
}

/**
 * Start the format JSON process
 */
function start() {
  if (options.help === true) return
  const folderPath = getPath()
  const files = getFiles(folderPath)
  for (const file of files) formatFile(file)
}

start()
