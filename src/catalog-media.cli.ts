/* v8 ignore start */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { Logger } from 'shuutils'
import { parseProbe, qualityFromName, qualityFromSize, sortQualities } from './catalog-media.quality'
import type { CatalogEntry } from './catalog-media.types'
import {
  countEpisodes,
  isIgnoredName,
  isVideoFile,
  keepBestCopies,
  mapLimit,
  moviePosterNames,
  nbQualitySamples,
  normalizeTitle,
  parseEnv,
  parseNfo,
  parseTitle,
  posterMaxBytes,
  posterQualities,
  posterWidth,
  renderCatalog,
  resolveDir,
  sampleEvenly,
  toCatalogItem,
  tvPosterNames,
} from './catalog-media.utils'

// use me like : bun ~/Projects/github/snippets/src/catalog-media.cli.ts
//  reads the folders listed in catalog-media.env (next to this file) and writes catalog-media.html in the current folder
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
    throw new Error(`missing ${envPath}, copy catalog-media.env.example to catalog-media.env and list your folders`)
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

await start()
