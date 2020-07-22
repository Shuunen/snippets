const { normalize, join } = require('path')
const { writeFileSync, lstatSync, readFileSync, readdirSync } = require('fs')

function formatFile (path) {
  const jsonIn = readFileSync(path)
  const jsonOut = JSON.stringify(JSON.parse(jsonIn), null, 2) + "\n"
  if (jsonIn !== jsonOut) writeFileSync(path, jsonOut)
}

function getFiles (path) {
  const stats = lstatSync(path)
  if (stats.isFile()) return [path]
  if (!stats.isDirectory()) throw new Error('path must be a file or folder')
  const files = readdirSync(path)
  return files.reduce((acc, file) => {
    if (file.includes('.json')) acc.push(join(path, file))
    return acc
  }, [])
}

function getPath () {
  if (process.argv.length <= 2) throw new Error('this script need a path as argument like : node format-json.js my-file.json or node format-json.js "C:\\My Folder\\"')
  return normalize(process.argv[2])
}

function start () {
  const path = getPath()
  const files = getFiles(path)
  for (const file of files) formatFile(file)
}

start()
