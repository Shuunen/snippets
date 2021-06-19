import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'

function formatFile (path) {
  const jsonIn = readFileSync(path)
  const jsonOut = JSON.stringify(JSON.parse(jsonIn), undefined, 2) + '\n'
  if (jsonIn !== jsonOut) writeFileSync(path, jsonOut)
}

function getFiles (path) {
  const stats = lstatSync(path)
  if (stats.isFile()) return [path]
  if (!stats.isDirectory()) throw new Error('path must be a file or folder')
  return readdirSync(path).filter(file => file.includes('.json')).map(file => path.join(path, file))
}

function getPath () {
  if (process.argv.length <= 2) throw new Error('this script need a path as argument like : node format-json.js my-file.json or node format-json.js "C:\\My Folder\\"')
  return path.normalize(process.argv[2])
}

function start () {
  const path = getPath()
  const files = getFiles(path)
  for (const file of files) formatFile(file)
}

start()
