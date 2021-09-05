import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { backupPath } from './files.js'

const clean = string => string.replace(/\s*/g, '')
export const equals = (content1, content2) => (clean(content1) === clean(content2))
export const filename = (path = '') => (/[/\\]([\w-]*[\w.-]+)$/.exec(path) || [])[1]

export const normalize = (filepath, useSlash, useTilde) => {
  let p = path.normalize(filepath)
  if (useSlash) p = p.replace(/\\/g, '/')
  if (useTilde) p = p.replace(home, '~')
  return p
}

const home = normalize(process.env.HOME, true)
export const relativeBackupPath = normalize(backupPath, true).replace(normalize(process.env.PWD, true), '').slice(1)

const read = async path => readFile(path, 'utf-8').catch(error => {
  if (!error.message.includes('no such file')) console.error(error)
  return false
})

export const report = async filepath => {
  let content = await read(filepath)
  if (/\r/.test(content) && !filepath.includes('.qbtheme')) { // qbtheme files does not like this
    content = content.replace(/\r\n/g, '\n')
    writeFile(filepath, content)
  }
  return {
    path: normalize(filepath),
    exists: Boolean(content),
    content,
  }
}

export const copy = async (source, destination) => {
  // destination will be created or overwritten by default.
  const destinationFolder = destination.replace(filename(destination), '')
  await mkdir(destinationFolder, { recursive: true })
  return copyFile(source, destination).then(() => true).catch(error => {
    console.log(error)
    return false
  })
}
