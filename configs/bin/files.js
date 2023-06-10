import { existsSync, readFileSync, writeFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { clean } from './utils.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentFolderPath = path.dirname(currentFilePath)
const changesFolderPath = path.join(currentFolderPath, '..', 'changes')

const home = process.env.HOME
const appData = process.env.APPDATA || (process.platform === 'darwin' ? `${home}Library/Preferences` : `${home}/.config`)
const onWindows = process.env.APPDATA === appData
// const prgFiles = 'C:/Program Files'

/** @type {import('./types').Config[]} */
const configs = [
  { source: `${home}/.bash_aliases` },
  { source: `${appData}/Code/User/keybindings.json`, renameTo: 'vscode-keybindings.json' },
  { source: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
  // { source: `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json' },
  // { source: `${appData}/HandBrake/settings.json`, renameTo: 'handbrake-settings.json' },
  { source: `${appData}/../Local/Clavier+/Clavier.ini`, removeLinesMatching: [/Usages/u] },
  { source: `${appData}/kupfer/kupfer.cfg` },
  { source: `${appData}/mpv/mpv.conf` },
  { source: `${appData}/qBittorrent/qBittorrent.conf` },
  { source: `${home}/.gitconfig-anatec` },
  { source: `${home}/.gitconfig-github` },
  { source: `${home}/.gitconfig` },
  { source: `${home}/.gitignore` },
  { source: `${home}/.local/share/applications/add-stuff.desktop` },
  { source: `${home}/.local/share/applications/app-image-pool.desktop` },
  { source: `${home}/.local/share/applications/appimagekit-photopea.desktop` },
  { source: `${home}/.local/share/applications/boxy.desktop` },
  { source: `${home}/.local/share/applications/electorrent.desktop` },
  { source: `${home}/.local/share/applications/font-base.desktop` },
  { source: `${home}/.local/share/applications/imagine.desktop` },
  { source: `${home}/.local/share/applications/isolate-lines-clipboard.desktop` },
  { source: `${home}/.local/share/applications/league-of-legends.desktop` },
  { source: `${home}/.local/share/applications/lol-practice-5v5.desktop` },
  { source: `${home}/.local/share/applications/stuff-finder.desktop` },
  // { source: `${home}/.local/share/nautilus/scripts/Shrink all pdf`},
  // { source: `${home}/.local/share/nautilus/scripts/Take screenshot`},
  { source: `${home}/.local/share/qBittorrent/themes/qbittorrent-darkstylesheet.qbtheme` },
  { source: `${home}/.profile` },
  // { source: `${home}/repo-checker.config.js` },
]

if (onWindows) configs.push(
  { source: `${home}/.bashrc` },
  { source: `${appData}/Launchy/launchy.ini`, removeLinesAfter: /\[History\]/u },
  { source: `${appData}/Greenshot/Greenshot.ini`, removeLinesAfter: /\[Editor\]/u, removeLinesMatching: [/^(?:ImgurUploadHistory|LastCapturedRegion|LastUpdateCheck|OutputFileAsFull|Commands=)/u, /MS Paint/u] },
)

// @ts-ignore
const currentFolder = path.dirname(fileURLToPath(import.meta.url))

/**
 * Convert carriage return to unix line endings
 * @param {string} content the content to be processed
 * @returns the processed content with unix line endings
 */
function useUnixCarriageReturn (content) {
  return content.replace(/\r\n/gu, '\n')
}

/**
 * Transform a file path to a FileDetails object
 * @param {string} filepath the file path
 * @returns the file details
 */
function getDetails (filepath) {
  const exists = existsSync(filepath)
  const content = exists ? readFileSync(filepath, 'utf8') : ''
  const updatedContent = /\r/u.test(content) && !filepath.includes('.qbtheme') ? useUnixCarriageReturn(content) : content // qbtheme files does not like \n
  if (content !== updatedContent) writeFile(filepath, updatedContent)
  return { filepath, exists, content: updatedContent }
}

/**
 * Get the filename from the config
 * @param {import('./types').Config} config the config
 * @returns the filename
 */
function getFilename ({ renameTo, source }) {
  return renameTo ?? path.basename(source)
}

/**
 * Check if the source and destination files content are equals
 * @param {import('./types').File} file the file to be checked
 * @param {import('./types').Config} config the config
 * @returns true if the files are equals
 */
function isEquals (file, config) {
  const { source, destination } = file
  const { removeLinesAfter, removeLinesMatching } = config
  const filename = getFilename(config)
  const areEquals = clean(source.content, removeLinesAfter, removeLinesMatching) === clean(destination.content, removeLinesAfter, removeLinesMatching)
  if (!areEquals) {
    writeFileSync(path.join(changesFolderPath, `${filename}-source.log`), clean(source.content, removeLinesAfter, removeLinesMatching, false))
    writeFileSync(path.join(changesFolderPath, `${filename}-destination.log`), clean(destination.content, removeLinesAfter, removeLinesMatching, false))
  }
  return areEquals
}

export const backupPath = path.join(currentFolder, '../files')

/** @type {import('./types').File[]} */
export const files = configs.map(config => {
  const filename = getFilename(config)
  const source = getDetails(config.source)
  const destination = getDetails(path.join(backupPath, filename))
  const /** @type {import('./types').File} */ file = { source, destination, equals: false }
  file.equals = isEquals(file, config)
  if (config.removeLinesMatching) file.removeLinesMatching = config.removeLinesMatching
  if (config.removeLinesAfter) file.removeLinesAfter = config.removeLinesAfter
  return file
})

