/* v8 ignore start */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dim } from 'shuutils'
import { computeBlocks } from './merge-logic.node'
import type { Config, File, FileDetails } from './types'
import { logger, useUnixCarriageReturn } from './utils.node'

const home = process.env.HOME ?? ''
const appData = process.env.APPDATA ?? (process.platform === 'darwin' ? `${home}Library/Preferences` : `${home}/.config`)
const isWindows = process.env.APPDATA === appData
// const prgFiles = 'C:/Program Files'
logger.info(`Using home directory ${dim(home)}`)
logger.info(`Using app data directory ${dim(appData)}`)
logger.info(`Detected platform ${dim(isWindows ? 'windows' : 'linux')}`)

const configs: Config[] = [
  { source: `${home}/.bash_aliases` },
  { renameTo: 'vscode-keybindings.json', source: `${appData}/Code/User/keybindings.json` },
  { renameTo: 'vscode-settings.json', source: `${appData}/Code/User/settings.json` },
  // { source: `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json' },
  // { source: `${appData}/HandBrake/settings.json`, renameTo: 'handbrake-settings.json' },
  { source: `${appData}/kupfer/kupfer.cfg` },
  { source: `${appData}/mpv/mpv.conf` },
  {
    removeBlocksMatching: [/(?<block>TorrentCreator|Dialog)\]/u],
    removeLinesMatching: [/@Size/, /(?<qt>Qt6|qt5)/, /(?<setting>Cookies|CurrentTab|FileLogger\\Path|geometry|LastDir|LastViewedPage|SavePathHistory|Sizes|Width)=/],
    source: `${appData}/qBittorrent/qBittorrent.conf`,
  },
  { source: `${home}/.gitconfig-anatec` },
  { source: `${home}/.gitconfig-collectif-energie` },
  { source: `${home}/.gitconfig-github` },
  { source: `${home}/.gitconfig` },
  { source: `${home}/.gitignore` },
  { source: `${home}/.local/share/qBittorrent/themes/qbittorrent-darkstylesheet.qbtheme` },
  { source: `${home}/.profile` },
  { renameTo: 'claude-md.md', source: `${home}/.claude/CLAUDE.md` },
  { renameTo: 'claude-rtk.md', source: `${home}/.claude/RTK.md` },
  { renameTo: 'claude-settings.json', source: `${home}/.claude/settings.json` },
  { renameTo: 'claude-status-line.sh', source: `${home}/.claude/statusline-command.sh` },
  { renameTo: 'autostart-xbox.desktop', source: `${home}/.config/autostart/xbox-controller-driver.desktop` },
  // { source: `${home}/repo-checker.config.js` },
]

const windowsConfigs: Config[] = [
  { renameTo: '.bashrc-windows', source: `${home}/.bashrc` },
  {
    removeLinesAfter: /\[History\]/u,
    removeLinesMatching: [/^(?:pos=|proxyType=)/u],
    source: `${appData}/Launchy/launchy.ini`,
  },
  { renameTo: 'espanso-config.yml', source: 'D:/Apps/Espanso/.espanso/config/default.yml' },
  { renameTo: 'espanso-match.yml', source: 'D:/Apps/Espanso/.espanso/match/base.yml' },
  {
    removeLinesAfter: /PowerpointSlideLayout=ppLayoutPictureWithCaption/u,
    removeLinesMatching: [/^(?:BaseIconSize|ImgurUploadHistory|LastCapturedRegion|LastSaveWithVersion|LastUpdateCheck|OutputFileAsFull|OutputFilePath|DeletedBuildInCommands|Win10BorderCrop|Commands=)/u, /MS Paint/u, /Paint\.NET/u],
    source: `${appData}/Greenshot/Greenshot.ini`,
  },
]

const linuxConfigs: Config[] = [
  { renameTo: '.bashrc-linux', source: `${home}/.bashrc` },
  { source: `${home}/.config/autostart/xbox-controller-driver.desktop` },
  { renameTo: 'ulauncher-scripts.json', source: `${home}/.config/ulauncher/scripts.json` },
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
  { source: `${home}/.local/share/kio/servicemenus/take-screenshot.desktop` },
  { renameTo: 'xfce4-helpers.rc', source: `${home}/.config/xfce4/helpers.rc` },
  // { source: `${home}/.local/share/nautilus/scripts/Shrink all pdf`},
  // { source: `${home}/.local/share/nautilus/scripts/Take screenshot`},
  { renameTo: 'espanso-config.yml', source: `${home}/.config/espanso/config/default.yml` },
  { renameTo: 'espanso-match.yml', source: `${home}/.config/espanso/match/base.yml` },
]

configs.push(...(isWindows ? windowsConfigs : linuxConfigs))

const currentFolder = import.meta.dirname

/**
 * Transform a file path to a FileDetails object
 * @param filepath the file path
 * @returns the file details
 */
function getDetails(filepath: string): FileDetails {
  const isExisting = existsSync(filepath)
  const content = isExisting ? readFileSync(filepath, 'utf8') : ''
  const updatedContent = content.includes('\r') && !filepath.includes('.qbtheme') ? useUnixCarriageReturn(content) : content // qbtheme files does not like \n
  const isContentEquals = content === updatedContent
  if (!isContentEquals) void writeFile(filepath, updatedContent)
  const modifiedAt = isExisting ? statSync(filepath).mtime : undefined
  return { content: updatedContent, filepath, isExisting, modifiedAt }
}

/**
 * Get the filename from the config
 * @param config the config
 * @returns the filename
 */
function getFilename(config: Config): string {
  const { renameTo, source } = config
  return renameTo ?? path.basename(source)
}

/**
 * Check if the source and destination files content are equals
 * @param file the file to be checked
 * @param config the config
 * @returns true if the files are equals
 */
function isEquals(file: File, config: Config): boolean {
  const { destination, source } = file
  const { removeBlocksMatching, removeLinesAfter, removeLinesMatching } = config
  const blocks = computeBlocks(destination.content, source.content, removeLinesAfter, removeLinesMatching, removeBlocksMatching)
  return !blocks.some(block => block.type === 'conflict' && !block.isNoise)
}

export const backupPath = path.join(currentFolder, '..', 'files')

export const files: File[] = configs.map(config => {
  const filename = getFilename(config)
  const source = getDetails(config.source)
  const destination = getDetails(path.join(backupPath, filename))
  const file: File = { areEquals: false, destination, source }
  file.areEquals = isEquals(file, config)
  if (config.removeLinesMatching) file.removeLinesMatching = config.removeLinesMatching
  if (config.removeLinesAfter) file.removeLinesAfter = config.removeLinesAfter
  if (config.removeBlocksMatching) file.removeBlocksMatching = config.removeBlocksMatching
  return file
})
