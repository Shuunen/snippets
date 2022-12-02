import { existsSync, readFileSync, writeFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { clean } from './utils.js'

const home = process.env['HOME']
const appData = process.env['APPDATA'] || (process.platform === 'darwin' ? home + 'Library/Preferences' : home + '/.config')
const onWindows = process.env['APPDATA'] === appData
// const prgFiles = 'C:/Program Files'

/**
 * @type {import('./types').Config[]} 
 */
const configs = [
  { source: `${appData}/Code/User/keybindings.json`, renameTo: 'vscode-keybindings.json' },
  { source: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
  // { source: `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json' },
  // { source: `${appData}/HandBrake/settings.json`, renameTo: 'handbrake-settings.json' },
  { source: `${appData}/../Local/Clavier+/Clavier.ini` },
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
  { source: `${home}/repo-checker.config.js` },
]

if (onWindows) configs.push(
  { source: `${home}/.bashrc` },
  { source: `${appData}/Launchy/launchy.ini`, removeLinesAfter: /\[History]/ },
  { source: `${appData}/Greenshot/Greenshot.ini`, removeLinesAfter: /\[Editor]/, removeLinesMatching: [/^(OutputFileAsFull|ImgurUploadHistory|LastUpdateCheck|LastCapturedRegion|Commands=)/, /MS Paint/] },
)

// @ts-ignore
const currentFolder = path.dirname(fileURLToPath(import.meta.url))

export const backupPath = path.join(currentFolder, '../files')

/**
 * Convert carriage return to unix line endings
 * @param {string} content the content to be processed
 * @returns {string} the processed content with unix line endings
 */
const useUnixCarriageReturn = content => content.replace(/\r\n/g, '\n')

/**
 * Transform a file path to a FileDetails object
 * @param {string} filepath the file path
 * @returns {import('./types').FileDetails} the file details
 */
const getDetails = filepath => {
  const exists = existsSync(filepath)
  const content = exists ? readFileSync(filepath, 'utf8') : ''
  const newContent = /\r/.test(content) && !filepath.includes('.qbtheme') ? useUnixCarriageReturn(content) : content // qbtheme files does not like \n
  if (content !== newContent) writeFile(filepath, newContent)
  return { filepath, exists, content: newContent }
}

/**
 * @type {import('./types').File[]}
 */
export const files = configs.map(config => {
  const { renameTo, removeLinesAfter, removeLinesMatching } = config
  const filename = renameTo ?? path.basename(config.source)
  const source = getDetails(config.source)
  const destination = getDetails(path.join(backupPath, filename))
  const equals = clean(source.content, removeLinesAfter, removeLinesMatching) === clean(destination.content, removeLinesAfter, removeLinesMatching)
  if (!equals) {
    writeFileSync(`configs/changes/${filename}-source.log`, clean(source.content, removeLinesAfter, removeLinesMatching, false))
    writeFileSync(`configs/changes/${filename}-destination.log`, clean(destination.content, removeLinesAfter, removeLinesMatching, false))
  }
  return { source, destination, equals, removeLinesMatching, removeLinesAfter }
})
