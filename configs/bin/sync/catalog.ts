/* v8 ignore start */
import type { Config } from '../types'

export type Platform = {
  /** where this platform keeps application settings */ appData: string
  /** the current user's home directory */ home: string
  isWindows: boolean
}

/**
 * Work out this machine's home and app-data directories, and whether it's Windows
 * @returns the detected platform
 */
export function detectPlatform(): Platform {
  const home = process.env.HOME ?? ''
  const isWindows = process.env.APPDATA !== undefined
  const appData = process.env.APPDATA ?? (process.platform === 'darwin' ? `${home}Library/Preferences` : `${home}/.config`)
  return { appData, home, isWindows }
}

/**
 * The configs backed up on every platform
 * @param platform the detected platform
 * @returns the shared configs
 */
function sharedConfigs(platform: Platform): Config[] {
  const { appData, home } = platform
  return [
    { local: `${home}/.bash_aliases` },
    { local: `${appData}/Code/User/keybindings.json`, renameTo: 'vscode-keybindings.json' },
    { local: `${appData}/Code/User/settings.json`, renameTo: 'vscode-settings.json' },
    // { local: `${appData}/HandBrake/presets.json`, renameTo: 'handbrake-presets.json' },
    // { local: `${appData}/HandBrake/settings.json`, renameTo: 'handbrake-settings.json' },
    { local: `${appData}/kupfer/kupfer.cfg` },
    { local: `${appData}/mpv/mpv.conf` },
    {
      local: `${appData}/qBittorrent/qBittorrent.conf`,
      removeBlocksMatching: [/(?<block>TorrentCreator|Dialog)\]/u],
      removeLinesMatching: [/@Size/, /(?<qt>Qt6|qt5)/, /(?<setting>Cookies|CurrentTab|FileLogger\\Path|geometry|LastDir|LastViewedPage|SavePathHistory|Sizes|Width)=/],
    },
    { local: `${home}/.gitconfig-anatec` },
    { local: `${home}/.gitconfig-collectif-energie` },
    { local: `${home}/.gitconfig-github` },
    { local: `${home}/.gitconfig` },
    { local: `${home}/.gitignore` },
    { local: `${home}/.local/share/qBittorrent/themes/qbittorrent-darkstylesheet.qbtheme` },
    { local: `${home}/.profile` },
    { local: `${home}/.claude/CLAUDE.md`, renameTo: 'claude-md.md' },
    { local: `${home}/.claude/RTK.md`, renameTo: 'claude-rtk.md' },
    { local: `${home}/.claude/settings.json`, renameTo: 'claude-settings.json' },
    { local: `${home}/.claude/statusline-command.sh`, renameTo: 'claude-status-line.sh' },
    { local: `${home}/.config/autostart/xbox-controller-driver.desktop`, renameTo: 'autostart-xbox.desktop' },
    // { local: `${home}/repo-checker.config.js` },
  ]
}

/**
 * The configs only backed up on Windows
 * @param platform the detected platform
 * @returns the windows-only configs
 */
function windowsConfigs(platform: Platform): Config[] {
  const { appData, home } = platform
  return [
    { local: `${home}/.bashrc`, renameTo: '.bashrc-windows' },
    {
      local: `${appData}/Launchy/launchy.ini`,
      removeLinesAfter: /\[History\]/u,
      removeLinesMatching: [/^(?:pos=|proxyType=)/u],
    },
    { local: 'D:/Apps/Espanso/.espanso/config/default.yml', renameTo: 'espanso-config.yml' },
    { local: 'D:/Apps/Espanso/.espanso/match/base.yml', renameTo: 'espanso-match.yml' },
    {
      local: `${appData}/Greenshot/Greenshot.ini`,
      removeLinesAfter: /PowerpointSlideLayout=ppLayoutPictureWithCaption/u,
      removeLinesMatching: [/^(?:BaseIconSize|ImgurUploadHistory|LastCapturedRegion|LastSaveWithVersion|LastUpdateCheck|OutputFileAsFull|OutputFilePath|DeletedBuildInCommands|Win10BorderCrop|Commands=)/u, /MS Paint/u, /Paint\.NET/u],
    },
  ]
}

/**
 * The configs only backed up on Linux
 * @param platform the detected platform
 * @returns the linux-only configs
 */
function linuxConfigs(platform: Platform): Config[] {
  const { home } = platform
  const applications = `${home}/.local/share/applications`
  const desktopFiles = ['add-stuff', 'app-image-pool', 'appimagekit-photopea', 'boxy', 'electorrent', 'font-base', 'imagine', 'isolate-lines-clipboard', 'league-of-legends', 'lol-practice-5v5', 'stuff-finder']
  return [
    { local: `${home}/.bashrc`, renameTo: '.bashrc-linux' },
    { local: `${home}/.config/autostart/xbox-controller-driver.desktop` },
    { local: `${home}/.config/ulauncher/scripts.json`, renameTo: 'ulauncher-scripts.json' },
    ...desktopFiles.map(name => ({ local: `${applications}/${name}.desktop` })),
    { local: `${home}/.local/share/kio/servicemenus/take-screenshot.desktop` },
    { local: `${home}/.config/xfce4/helpers.rc`, renameTo: 'xfce4-helpers.rc' },
    // { local: `${home}/.local/share/nautilus/scripts/Shrink all pdf` },
    // { local: `${home}/.local/share/nautilus/scripts/Take screenshot` },
    { local: `${home}/.config/espanso/config/default.yml`, renameTo: 'espanso-config.yml' },
    { local: `${home}/.config/espanso/match/base.yml`, renameTo: 'espanso-match.yml' },
  ]
}

/**
 * Every config to back up on this machine
 * @param platform the detected platform
 * @returns the configs, shared ones first
 */
export function getConfigs(platform: Platform): Config[] {
  return [...sharedConfigs(platform), ...(platform.isWindows ? windowsConfigs(platform) : linuxConfigs(platform))]
}
