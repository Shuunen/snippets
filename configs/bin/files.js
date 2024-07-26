/* c8 ignore start */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clean, useUnixCarriageReturn } from './utils.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentFolderPath = path.dirname(currentFilePath)
const changesFolderPath = path.join(currentFolderPath, '..', 'changes')

const home = process.env.HOME ?? ''
const appData = process.env.APPDATA ?? (process.platform === 'darwin' ? `${home}Library/Preferences` : `${home}/.config`)
const isWindows = process.env.APPDATA === appData
// const prgFiles = 'C:/Program Files'

/* eslint-disable perfectionist/sort-objects */
/** @type {import('./types').Config[]} */
const configs = [
  { source: `${home}/.bash_aliases` },
  { source: `${appData}/Code/User/keybindings.json`, renameTo: 'vscode-keybindings.json' },
  { source: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
  // { source: `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json' },
  // { source: `${appData}/HandBrake/settings.json`, renameTo: 'handbrake-settings.json' },
  { source: `${appData}/espanso/config/default.yml`, renameTo: 'espanso-config.yml' },
  { source: `${appData}/espanso/match/base.yml`, renameTo: 'espanso-match.yml' },
  { source: `${appData}/kupfer/kupfer.cfg` },
  { source: `${appData}/mpv/mpv.conf` },
  { source: `${appData}/qBittorrent/qBittorrent.conf` },
  { source: `${home}/.gitconfig-anatec` },
  { source: `${home}/.gitconfig-collectif-energie` },
  { source: `${home}/.gitconfig-github` },
  { source: `${home}/.gitconfig` },
  { source: `${home}/.gitignore` },
  { source: `${home}/.local/share/qBittorrent/themes/qbittorrent-darkstylesheet.qbtheme` },
  { source: `${home}/.profile` },
  // { source: `${home}/repo-checker.config.js` },
]

const windowsConfigs = [
  { source: `${home}/.bashrc`, renameTo: '.bashrc-windows' },
  { source: `${appData}/Launchy/launchy.ini`, removeLinesAfter: /\[History\]/u, removeLinesMatching: [/^(?:pos=|proxyType=)/u] },
  { source: `${appData}/Greenshot/Greenshot.ini`, removeLinesAfter: /PowerpointSlideLayout=ppLayoutPictureWithCaption/u, removeLinesMatching: [/^(?:BaseIconSize|ImgurUploadHistory|LastCapturedRegion|LastSaveWithVersion|LastUpdateCheck|OutputFileAsFull|OutputFilePath|Win10BorderCrop|Commands=)/u, /MS Paint/u] },
]

const linuxConfigs = [
  { source: `${home}/.bashrc`, renameTo: '.bashrc-linux' },
  { source: `${home}/.config/autostart/xbox-controller-driver.desktop` },
  { source: `${home}/.config/ulauncher/scripts.json`, renameTo: 'ulauncher-scripts.json' },
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
]
/* eslint-enable perfectionist/sort-objects */

configs.push(...(isWindows ? windowsConfigs : linuxConfigs))

const currentFolder = path.dirname(fileURLToPath(import.meta.url))

/**
 * Transform a file path to a FileDetails object
 * @param {string} filepath the file path
 * @returns {import('./types').FileDetails} the file details
 */
function getDetails (filepath) {
  const isExisting = existsSync(filepath)
  const content = isExisting ? readFileSync(filepath, 'utf8') : ''
  const updatedContent = content.includes('\r') && !filepath.includes('.qbtheme') ? useUnixCarriageReturn(content) : content // qbtheme files does not like \n
  const isContentEquals = content === updatedContent
  if (!isContentEquals) void writeFile(filepath, updatedContent)
  return { content: updatedContent, filepath, isExisting }
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
  const { destination, source } = file
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
  const /** @type {import('./types').File} */ file = { areEquals: false, destination, source }
  file.areEquals = isEquals(file, config)
  if (config.removeLinesMatching) file.removeLinesMatching = config.removeLinesMatching
  if (config.removeLinesAfter) file.removeLinesAfter = config.removeLinesAfter
  return file
})

