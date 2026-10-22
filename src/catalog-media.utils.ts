import { invariant } from 'es-toolkit'
import { formatQualities } from './catalog-media.quality'
import type { CatalogEntry, CatalogEnv, CatalogItem, Nfo } from './catalog-media.types'

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
