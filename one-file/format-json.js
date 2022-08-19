#!/usr/bin/env node
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * @param {string} filePath
 */
function formatFile (filePath) {
  const jsonIn = readFileSync(filePath, 'utf8')
  const jsonOut = JSON.stringify(JSON.parse(jsonIn), undefined, 2) + '\n'
  if (jsonIn !== jsonOut) writeFileSync(filePath, jsonOut)
}

/**
 * @param {string} folderPath
 */
function getFiles (folderPath) {
  const stats = lstatSync(folderPath)
  if (stats.isFile()) return [folderPath]
  if (!stats.isDirectory()) throw new Error('path must be a file or folder')
  return readdirSync(folderPath).filter((/** @type {string} */ file) => file.includes('.json')).map((/** @type {string} */ file) => path.join(folderPath, file))
}

/**
 * The path to format
 * @returns {string}
 */
function getPath () {
  if (process.argv.length <= 2) throw new Error('this script need a path as argument like : format-json.js my-file.json or format-json.js "C:\\My Folder\\"')
  return path.normalize(process.argv[2] || '')
}

function start () {
  const folderPath = getPath()
  const files = getFiles(folderPath)
  for (const file of files) formatFile(file)
}

start()
