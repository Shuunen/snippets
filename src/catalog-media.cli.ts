/* oxlint-disable max-lines */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { invariant } from 'es-toolkit'
import sharp from 'sharp'
import { Logger } from 'shuutils'

export type CatalogEnv = {
  movieDirs: string[]
  tvShowDirs: string[]
}

export type Nfo = {
  directors: string[]
  genres: string[]
  plot?: string
  rating?: string
  title?: string
  year?: string
}

/** A movie or a tv show found in the folders, before dedupe and poster encoding */
export type CatalogEntry = {
  directors: string[]
  episodes?: number
  genres: string[]
  key: string
  plot?: string
  posterPath?: string
  qualities: number[]
  rating?: string
  seasons?: number
  title: string
  year?: string
}

/** What the html page receives for one movie or tv show */
export type CatalogItem = {
  date?: string
  directors?: string
  eps?: number
  genre?: string
  img?: string
  name: string
  plot?: string
  quality?: string
  rating?: string
  seasons?: number
}

const qualityRegex = {
  quality: /\b(?<height>2160|1080|720|576|480|360)p\b/iu,
  quality4k: /\b(?:4K|UHD)\b/iu,
}
const uhd = 2160
const fullHd = 1080
const hd = 720
const pal = 576
const ntsc = 480
const uhdMinWidth = 3000
const fullHdMinWidth = 1800
const hdMinWidth = 1200
const palMinHeight = 500

/**
 * Detect the resolution written in a file name
 * @param name the file name
 * @returns the height like 1080, or undefined if not written
 */
export function qualityFromName(name: string) {
  const height = qualityRegex.quality.exec(name)?.groups?.height
  if (height) return Number(height)
  return qualityRegex.quality4k.test(name) ? uhd : undefined
}

/**
 * Convert the real size of a video to a standard resolution
 * @param width the video width in pixels
 * @param height the video height in pixels
 * @returns the closest standard height like 1080
 */
export function qualityFromSize(width: number, height: number) {
  if (width >= uhdMinWidth) return uhd
  if (width >= fullHdMinWidth) return fullHd
  if (width >= hdMinWidth) return hd
  return height >= palMinHeight ? pal : ntsc
}

/**
 * @param output the stdout of ffprobe with csv=p=0 output
 * @returns the width and height, or undefined if the output is not readable
 */
export function parseProbe(output: string) {
  const [width, height] = output.trim().split('\n')[0].split(',').map(Number)
  if (!width || !height) return undefined
  return { height, width }
}

/**
 * @param qualities the resolutions found
 * @returns the resolutions sorted from the best, without duplicates
 */
export function sortQualities(qualities: number[]) {
  return [...new Set(qualities)].toSorted((qualityA, qualityB) => qualityB - qualityA)
}

/**
 * @param qualities the resolutions found
 * @returns the text to display
 * @example formatQualities([720, 1080, 720]) // '1080p · 720p'
 */
export function formatQualities(qualities: number[]) {
  return sortQualities(qualities)
    .map(quality => `${quality}p`)
    .join(' · ')
}

export const posterWidth = 220
export const posterMaxBytes = 10_240
const posterQualityStart = 35
const posterQualityStep = 5
const nbPosterTries = 5
/** From the best to the lowest quality, a poster is encoded again with the next one when it is too heavy */
export const posterQualities = Array.from({ length: nbPosterTries }, (_item, index) => posterQualityStart - index * posterQualityStep)
export const nbQualitySamples = 4

const smbPrefix = 'smb://'
const ignoredNames = new Set(['Plex ignore'])
const regex = {
  cutTitle: /[\s.(](?<year>(?:19|20)\d{2})(?=[\s.)\]]|$)|[\s.]S\d{2}|[\s.([](?:2160|1080|720|576|480)p/iu,
  episode: /S(?<season>\d{1,4})E\d+/iu,
  video: /\.(?:avi|m4v|mkv|mp4|mpg|wmv)$/iu,
}

/**
 * Parse the content of the catalog-media.env file
 * @param content the env file content
 * @returns the folders to scan
 */
export function parseEnv(content: string) {
  const env: CatalogEnv = { movieDirs: [], tvShowDirs: [] }
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const [key = '', ...rest] = line.split('=')
    const value = rest
      .join('=')
      .trim()
      .replaceAll(/^["']|["']$/gu, '')
    if (key === 'MOVIES_DIR') env.movieDirs.push(value)
    else if (key === 'TV_SHOWS_DIR') env.tvShowDirs.push(value)
    else throw new Error(`unknown key "${key}" in env file, expected MOVIES_DIR or TV_SHOWS_DIR`)
  }
  return env
}

/**
 * Translate a smb:// url to the path where gvfs mounts it, leave any other path untouched
 * @param value the folder from the env file
 * @param uid the id of the current user, used in the gvfs mount path
 * @returns the path to read on this machine
 * @example resolveDir('smb://my-nas.local/movies/good/', 1000) // '/run/user/1000/gvfs/smb-share:server=my-nas.local,share=movies/good'
 */
export function resolveDir(value: string, uid: number) {
  if (!value.startsWith(smbPrefix)) return value
  const { hostname, pathname } = new URL(value)
  const [share, ...rest] = decodeURIComponent(pathname).split('/').filter(Boolean)
  invariant(share, `missing share name in ${value}`)
  return [`/run/user/${uid}/gvfs/smb-share:server=${hostname},share=${share}`, ...rest].join('/')
}

/**
 * Check if a file or folder name should be skipped (hidden, recycle bin, ...)
 * @param name the file or folder name
 * @returns true if it should be skipped
 */
export function isIgnoredName(name: string) {
  return name.startsWith('.') || name.startsWith('#') || ignoredNames.has(name)
}

/**
 * @param name a file name
 * @returns true if the file is a video
 */
export function isVideoFile(name: string) {
  return regex.video.test(name)
}

/**
 * @param xml the text to decode
 * @returns the text without xml entities
 */
function decodeXml(xml: string) {
  return xml
    .replaceAll(/&#x(?<hex>[\da-f]+);/giu, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replaceAll(/&#(?<dec>\d+);/gu, (_match, dec: string) => String.fromCodePoint(Number(dec)))
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

/**
 * @param xml the xml content
 * @param name the tag name
 * @returns the text of every non-empty tag with this name
 */
function readTags(xml: string, name: string) {
  const matches = xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`, 'gu'))
  return [...matches].map(match => decodeXml(match[1]).trim()).filter(Boolean)
}

/**
 * Parse a tinyMediaManager movie or tvshow nfo file
 * @param xml the nfo content
 * @returns the useful fields
 */
export function parseNfo(xml: string): Nfo {
  const defaultRating = /<rating[^>]*default="true"[^>]*>\s*<value>(?<value>[\d.]+)<\/value>/u.exec(xml)?.groups?.value
  const [title] = readTags(xml, 'title')
  const [year] = readTags(xml, 'year')
  const [plot] = readTags(xml, 'plot')
  const [firstRating] = readTags(xml, 'value')
  const rating = defaultRating ?? firstRating
  return {
    directors: readTags(xml, 'director'),
    genres: readTags(xml, 'genre'),
    ...(plot && { plot }),
    ...(rating && Number(rating) > 0 && { rating }),
    ...(title && { title }),
    ...(year && { year }),
  }
}

/**
 * Guess the title and year from a release name or a folder name, used when there is no nfo
 * @param name the file or folder name, without extension
 * @returns the title and the year if found
 * @example parseTitle('A.Life.Less.Ordinary.1997.1080p.BluRay.x265-RARBG') // { title: 'A Life Less Ordinary', year: '1997' }
 */
export function parseTitle(name: string) {
  const match = regex.cutTitle.exec(name)
  const cut = match === null ? name : name.slice(0, match.index)
  const spaced = cut.includes(' ') ? cut : cut.replaceAll(/[._]/gu, ' ')
  const year = match?.groups?.year
  return { title: spaced.replaceAll(/\s+/gu, ' ').trim(), ...(year && { year }) }
}

/**
 * @param title the title to compare
 * @returns a lowercase title without accents, spaces or punctuation
 */
export function normalizeTitle(title: string) {
  return title
    .normalize('NFD')
    .toLowerCase()
    .replaceAll(/[^\da-z]/gu, '')
}

/**
 * Pick a few items spread over the whole list
 * @param list the items
 * @param nb how many items to pick at most
 * @returns the picked items, first and last included
 */
export function sampleEvenly<Item>(list: Item[], nb: number) {
  const count = Math.min(nb, list.length)
  const indexes = new Set(Array.from({ length: count }, (_item, index) => Math.round((index * (list.length - 1)) / Math.max(count - 1, 1))))
  return [...indexes].map(index => list[index])
}

/**
 * @param files the video file names of a tv show
 * @returns the number of seasons (if the names tell) and of episodes
 */
export function countEpisodes(files: string[]) {
  const seasons = new Set(files.map(file => regex.episode.exec(file)?.groups?.season).filter(Boolean))
  return { episodes: files.length, ...(seasons.size > 0 && { seasons: seasons.size }) }
}

/**
 * @param videoName the movie file name
 * @returns the poster file names tinyMediaManager can have written next to it, by priority
 */
export function moviePosterNames(videoName: string) {
  const base = videoName.replace(/\.[^.]+$/u, '')
  return [`${base}-poster.jpg`, `${base}-poster.png`, 'poster.jpg']
}

/** Names of the poster in a tv show folder, by priority */
export const tvPosterNames = ['poster.jpg', 'poster.png']

/**
 * Keep one entry by title, the one with the best quality, the first one wins a tie
 * @param entries the entries, in the order of the folders in the env file
 * @returns the entries without duplicates
 */
export function keepBestCopies(entries: CatalogEntry[]) {
  const best = new Map<string, CatalogEntry>()
  for (const entry of entries) {
    const current = best.get(entry.key)
    if (current === undefined || Math.max(...entry.qualities, 0) > Math.max(...current.qualities, 0)) best.set(entry.key, entry)
  }
  return [...best.values()]
}

/**
 * Run an async function on every item, with a limited number running at the same time
 * @param items the items
 * @param limit how many to run at the same time
 * @param run the function to run on each item
 * @returns the results, in the same order as the items
 */
export async function mapLimit<Item, Result>(items: Item[], limit: number, run: (item: Item) => Promise<Result>) {
  const results: Result[] = []
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next
      next += 1
      // oxlint-disable-next-line no-await-in-loop
      results[index] = await run(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * @param entry a movie or tv show
 * @param img the base64 AVIF poster
 * @returns the data used by the html page
 */
export function toCatalogItem(entry: CatalogEntry, img?: string): CatalogItem {
  const quality = formatQualities(entry.qualities)
  return {
    name: entry.title,
    ...(entry.year && { date: entry.year }),
    ...(entry.directors.length > 0 && { directors: entry.directors.join(', ') }),
    ...(entry.episodes && { eps: entry.episodes }),
    ...(entry.genres.length > 0 && { genre: entry.genres.join(', ') }),
    ...(img && { img }),
    ...(entry.plot && { plot: entry.plot }),
    ...(quality && { quality }),
    ...(entry.rating && { rating: entry.rating }),
    ...(entry.seasons && { seasons: entry.seasons }),
  }
}

/**
 * Put the catalog data in the html template
 * @param template the html template, with a __DATA__ placeholder
 * @param catalog the movies and tv shows, with the date they are produced, shown at the top of the page
 * @returns the standalone html page
 */
export function renderCatalog(template: string, catalog: { generated: Date; movies: CatalogItem[]; shows: CatalogItem[] }) {
  invariant(template.includes('__DATA__'), 'the template needs a __DATA__ placeholder')
  const data = JSON.stringify({ ...catalog, generated: catalog.generated.toISOString() }).replaceAll('</', String.raw`<\/`)
  return template.replace('__DATA__', () => data)
}

/* v8 ignore start */
// use me like : bun ~/Projects/github/snippets/src/catalog-media.cli.ts
//  reads the folders listed in catalog-media.env and writes catalog-media.html in the current folder
//  example of catalog-media.env (next to this file, git ignored), one folder per line, repeat the key to add more :
//    MOVIES_DIR=smb://my-nas.local/movies/
//    MOVIES_DIR=/mnt/archives/movies/
//    TV_SHOWS_DIR=smb://my-nas.local/tv-shows/
//    TV_SHOWS_DIR=/mnt/archives/tv-shows/
//  smb://host/share/path is translated to the gvfs mount path, a plain local path works too
//  when a title is in several folders, the copy with the best quality wins
//  add --no-cache to ignore the cache of posters and video resolutions, kept in src/.cache/catalog-media

const execFileAsync = promisify(execFile)
const logger = new Logger()
const noCache = process.argv.includes('--no-cache')
const envPath = path.join(import.meta.dirname, 'catalog-media.env')
const templatePath = path.join(import.meta.dirname, 'catalog-media.template.html')
const cacheDir = path.join(import.meta.dirname, '.cache', 'catalog-media')
const probesPath = path.join(cacheDir, 'probes.json')
const outputPath = path.join(process.cwd(), 'catalog-media.html')
const nbConcurrent = 8
const nbBytesInMb = 1_000_000
const probeTimeoutMs = 40_000
const uid = process.getuid?.() ?? 0
let probes: Record<string, [number, number] | 0> = {}

/**
 * @param file a file path
 * @returns a key that changes when the file changes
 */
async function fileKey(file: string) {
  const { mtimeMs, size } = await stat(file)
  return `${file}|${mtimeMs}|${size}`
}

/**
 * Read the width and height of a video, with ffprobe, remembered in the cache
 * @param video the video path
 * @returns the standard resolution like 1080, or undefined if unreadable
 */
async function probeQuality(video: string) {
  const key = await fileKey(video)
  let size = noCache ? undefined : probes[key]
  if (size === undefined) {
    const args = ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', video]
    const output = await execFileAsync('ffprobe', args, { timeout: probeTimeoutMs }).then(
      ({ stdout }) => stdout,
      () => '',
    )
    const parsed = parseProbe(output)
    size = parsed ? [parsed.width, parsed.height] : 0
    probes[key] = size
  }
  return size === 0 ? undefined : qualityFromSize(...size)
}

/**
 * @param video the video path
 * @returns the resolution from the file name, else from the video itself
 */
async function getQuality(video: string) {
  return qualityFromName(path.basename(video)) ?? (await probeQuality(video))
}

/**
 * @param folder the folder to scan
 * @returns every file below this folder, hidden and ignored folders excluded
 */
async function walk(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter(entry => !isIgnoredName(entry.name))
      .map(entry => {
        const full = path.join(folder, entry.name)
        return entry.isDirectory() ? walk(full) : Promise.resolve([full])
      }),
  )
  return files.flat()
}

/**
 * @param file a file path
 * @returns the content, or undefined if the file can not be read
 */
function readText(file: string) {
  return readFile(file, 'utf8').catch(() => '')
}

/**
 * Find movies in a folder, each video has its nfo and poster next to it
 * @param folder the folder to scan
 * @returns the movies found
 */
async function scanMovies(folder: string) {
  logger.info(`Scanning movies in ${folder}`)
  const files = await walk(folder)
  const known = new Set(files)
  const videos = files.filter(file => isVideoFile(file))
  return mapLimit(videos, nbConcurrent, async video => {
    const nfo = parseNfo(await readText(video.replace(/\.[^.]+$/u, '.nfo')))
    const guess = parseTitle(path.basename(video).replace(/\.[^.]+$/u, ''))
    const title = nfo.title ?? guess.title
    const year = nfo.year ?? guess.year
    const posterPath = moviePosterNames(path.basename(video))
      .map(name => path.join(path.dirname(video), name))
      .find(candidate => known.has(candidate))
    const quality = await getQuality(video)
    return { ...nfo, key: `${normalizeTitle(title)}|${year ?? ''}`, ...(posterPath && { posterPath }), qualities: quality ? [quality] : [], title, ...(year && { year }) } satisfies CatalogEntry
  })
}

/**
 * Find the tv shows in a folder, one sub folder per show
 * @param folder the folder to scan
 * @returns the tv shows found
 */
async function scanTvShows(folder: string) {
  logger.info(`Scanning tv shows in ${folder}`)
  const entries = await readdir(folder, { withFileTypes: true })
  const folders = entries.filter(entry => entry.isDirectory() && !isIgnoredName(entry.name))
  return mapLimit(folders, nbConcurrent, async ({ name }) => {
    const root = path.join(folder, name)
    const files = await walk(root)
    const videos = files.filter(file => isVideoFile(file))
    if (videos.length === 0) return undefined
    const nfo = parseNfo(await readText(path.join(root, 'tvshow.nfo')))
    const guess = parseTitle(name)
    const title = nfo.title ?? guess.title
    const year = nfo.year ?? guess.year
    const posterName = tvPosterNames.find(candidate => files.includes(path.join(root, candidate)))
    const sampled = await Promise.all(sampleEvenly(videos, nbQualitySamples).map(video => getQuality(video)))
    const qualities = sortQualities(sampled.filter(quality => quality !== undefined))
    const counts = countEpisodes(videos.map(video => path.basename(video)))
    return { ...nfo, ...counts, key: normalizeTitle(title), ...(posterName && { posterPath: path.join(root, posterName) }), qualities, title, ...(year && { year }) } satisfies CatalogEntry
  })
}

/**
 * Shrink a poster to a small AVIF, lowering the quality until it is light enough, remembered in the cache
 * @param poster the poster path
 * @returns the AVIF as base64
 */
async function encodePoster(poster: string) {
  const hash = createHash('sha1')
    .update(`${await fileKey(poster)}|${posterWidth}|${posterMaxBytes}`)
    .digest('hex')
  const cached = path.join(cacheDir, `${hash}.avif`)
  const hit = noCache ? undefined : await readFile(cached).catch(() => undefined)
  if (hit) return hit.toString('base64')
  const input = await readFile(poster)
  let output = Buffer.alloc(0)
  for (const quality of posterQualities) {
    // oxlint-disable-next-line no-await-in-loop
    output = await sharp(input).resize({ width: posterWidth, withoutEnlargement: true }).avif({ chromaSubsampling: '4:2:0', effort: 9, quality }).toBuffer()
    if (output.length <= posterMaxBytes) break
  }
  await writeFile(cached, output)
  return output.toString('base64')
}

/**
 * @param entries the movies or tv shows, in the order of the folders
 * @returns the data for the html page
 */
function toItems(entries: CatalogEntry[]) {
  const best = keepBestCopies(entries)
  logger.info(`${best.length} titles kept from ${entries.length} found`)
  return mapLimit(best, nbConcurrent, async entry => toCatalogItem(entry, entry.posterPath ? await encodePoster(entry.posterPath).catch(() => undefined) : undefined))
}

/**
 * Build the catalog
 */
async function start() {
  logger.info('Catalog media is starting !')
  const envContent = await readFile(envPath, 'utf8').catch(() => {
    throw new Error(`missing ${envPath}, create it and list your folders, see the example at the top of catalog-media.cli.ts`)
  })
  const env = parseEnv(envContent)
  await mkdir(cacheDir, { recursive: true })
  if (!noCache) probes = JSON.parse(await readText(probesPath).then(text => text || '{}')) as typeof probes
  const moviesByDir = await Promise.all(env.movieDirs.map(dir => scanMovies(resolveDir(dir, uid))))
  const showsByDir = await Promise.all(env.tvShowDirs.map(dir => scanTvShows(resolveDir(dir, uid))))
  const movies = moviesByDir.flat()
  const shows = showsByDir.flat().filter(show => show !== undefined)
  await writeFile(probesPath, JSON.stringify(probes))
  const html = renderCatalog(await readFile(templatePath, 'utf8'), { generated: new Date(), movies: await toItems(movies), shows: await toItems(shows) })
  await writeFile(outputPath, html)
  logger.info(`Done, ${outputPath} is ${(html.length / nbBytesInMb).toFixed(1)} MB`)
}

if (import.meta.main) await start()
