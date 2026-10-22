import { sleep } from 'shuutils'
import { emptyRatingNfo, movieNfo, showNfo, template } from './catalog-media.mock'
import { formatQualities, parseProbe, qualityFromName, qualityFromSize, sortQualities } from './catalog-media.quality'
import type { CatalogEntry } from './catalog-media.types'
import {
  countEpisodes,
  isIgnoredName,
  isVideoFile,
  keepBestCopies,
  mapLimit,
  moviePosterNames,
  normalizeTitle,
  parseEnv,
  parseNfo,
  parseTitle,
  renderCatalog,
  resolveDir,
  sampleEvenly,
  toCatalogItem,
  tvPosterNames,
} from './catalog-media.utils'

const entry = (key: string, qualities: number[], title = key): CatalogEntry => ({ directors: [], genres: [], key, qualities, title })

describe('parseEnv', () => {
  it('parseEnv A repeated keys, comments and quotes', () => {
    const env = parseEnv('# a comment\n\nMOVIES_DIR=smb://nas/movies/\nMOVIES_DIR="/local/movies"\nTV_SHOWS_DIR=/a=b\n')
    expect(env).toStrictEqual({ movieDirs: ['smb://nas/movies/', '/local/movies'], tvShowDirs: ['/a=b'] })
  })

  it('parseEnv B unknown key', () => {
    expect(() => parseEnv('SERIES_DIR=/tv')).toThrow('unknown key "SERIES_DIR"')
  })
})

describe('resolveDir', () => {
  it('resolveDir A smb share root and sub folders', () => {
    expect(resolveDir('smb://my-nas.local/movies/', 1000)).toBe('/run/user/1000/gvfs/smb-share:server=my-nas.local,share=movies')
    expect(resolveDir('smb://my-nas.local/archives/movies/good%20stuff/', 1000)).toBe('/run/user/1000/gvfs/smb-share:server=my-nas.local,share=archives/movies/good stuff')
  })

  it('resolveDir B local path untouched', () => {
    expect(resolveDir('/mnt/movies', 1000)).toBe('/mnt/movies')
  })

  it('resolveDir C smb without share', () => {
    expect(() => resolveDir('smb://my-nas.local/', 1000)).toThrow('missing share name')
  })
})

describe('file names', () => {
  it('isIgnoredName A', () => {
    expect([isIgnoredName('.recycle'), isIgnoredName('#recycle'), isIgnoredName('Plex ignore'), isIgnoredName('Firefly')]).toStrictEqual([true, true, true, false])
  })

  it('isVideoFile A', () => {
    expect([isVideoFile('a.MKV'), isVideoFile('a.mp4'), isVideoFile('a.nfo')]).toStrictEqual([true, true, false])
  })

  it('moviePosterNames A', () => {
    expect(moviePosterNames('Airplane (1980) 2160p.mkv')).toStrictEqual(['Airplane (1980) 2160p-poster.jpg', 'Airplane (1980) 2160p-poster.png', 'poster.jpg'])
    expect(tvPosterNames).toStrictEqual(['poster.jpg', 'poster.png'])
  })
})

describe('parseNfo', () => {
  it('parseNfo A movie with default rating, entities and several tags', () => {
    expect(parseNfo(movieNfo)).toStrictEqual({
      directors: ['Joe Wright'],
      genres: ['Drama', 'Romance'],
      plot: 'A young girl ét<3> "lies" \'a lot\'.',
      rating: '7.8',
      title: 'Atonement & more',
      year: '2007',
    })
  })

  it('parseNfo B tv show without default rating uses the first one', () => {
    expect(parseNfo(showNfo)).toStrictEqual({ directors: [], genres: ['Sci-Fi'], rating: '8.4', title: 'Firefly', year: '2002' })
  })

  it('parseNfo C zero rating is dropped, empty nfo is fine', () => {
    expect(parseNfo(emptyRatingNfo)).toStrictEqual({ directors: [], genres: [], title: 'Unrated' })
    expect(parseNfo('')).toStrictEqual({ directors: [], genres: [] })
  })
})

describe('parseTitle', () => {
  it.each([
    ['Airplane (1980) MULTi VFI 2160p 10bit', { title: 'Airplane', year: '1980' }],
    ['A.Life.Less.Ordinary.1997.1080p.BluRay.x265-RARBG', { title: 'A Life Less Ordinary', year: '1997' }],
    ['All Her Fault (2025) S01 (1080p AMZN)', { title: 'All Her Fault', year: '2025' }],
    ['Adolescence.S01.MULTI.2160p.WEBRip', { title: 'Adolescence' }],
    ['Dark.Matter.1080p.WEB', { title: 'Dark Matter' }],
    ['Firefly', { title: 'Firefly' }],
    ['3615 Usul', { title: '3615 Usul' }],
  ])('parseTitle %s', (name, expected) => {
    expect(parseTitle(name)).toStrictEqual(expected)
  })
})

describe('quality', () => {
  it('normalizeTitle A', () => {
    expect(normalizeTitle('Le Dézapping, du Before !')).toBe('ledezappingdubefore')
  })

  it.each([
    ['Movie (1976) 1080p DTS.mkv', 1080],
    ['Movie.2160P.WEB', 2160],
    ['Movie 4K HDR', 2160],
    ['Movie UHD', 2160],
    ['Movie - S01E01 - Episode.mkv', undefined],
  ])('qualityFromName %s', (name, expected) => {
    expect(qualityFromName(name)).toBe(expected)
  })

  it.each([
    [3840, 1600, 2160],
    [1920, 800, 1080],
    [1280, 720, 720],
    [720, 576, 576],
    [720, 480, 480],
  ])('qualityFromSize %i x %i', (width, height, expected) => {
    expect(qualityFromSize(width, height)).toBe(expected)
  })

  it('parseProbe A', () => {
    expect(parseProbe('1920,1080\n')).toStrictEqual({ height: 1080, width: 1920 })
    expect(parseProbe('')).toBeUndefined()
    expect(parseProbe('N/A')).toBeUndefined()
  })

  it('sortQualities and formatQualities A', () => {
    expect(sortQualities([720, 1080, 720])).toStrictEqual([1080, 720])
    expect(formatQualities([720, 1080, 720])).toBe('1080p · 720p')
    expect(formatQualities([])).toBe('')
  })
})

describe('lists', () => {
  it('sampleEvenly A', () => {
    expect(sampleEvenly([1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toStrictEqual([1, 4, 6, 9])
    expect(sampleEvenly([1, 2], 4)).toStrictEqual([1, 2])
    expect(sampleEvenly([7], 4)).toStrictEqual([7])
    expect(sampleEvenly([], 4)).toStrictEqual([])
  })

  it('countEpisodes A', () => {
    expect(countEpisodes(['Show - S01E01.mkv', 'Show - S01E02.mkv', 'Show - S02E01.mkv'])).toStrictEqual({ episodes: 3, seasons: 2 })
    expect(countEpisodes(['one.mkv'])).toStrictEqual({ episodes: 1 })
  })

  it('keepBestCopies A best quality wins, a tie keeps the first, order is kept', () => {
    const first = entry('a', [1080], 'first')
    const better = entry('a', [2160], 'better')
    const other = entry('b', [], 'other')
    const tie = entry('b', [], 'tie')
    expect(keepBestCopies([first, other, better, tie])).toStrictEqual([better, other])
  })

  it('mapLimit A keeps order and limits concurrency', async () => {
    let running = 0
    let peak = 0
    const results = await mapLimit([30, 10, 20, 5], 2, async ms => {
      running += 1
      peak = Math.max(peak, running)
      await sleep(ms)
      running -= 1
      return ms * 2
    })
    expect(results).toStrictEqual([60, 20, 40, 10])
    expect(peak).toBe(2)
    await expect(mapLimit([], 2, () => Promise.resolve(1))).resolves.toStrictEqual([])
  })
})

describe('render', () => {
  it('toCatalogItem A full entry', () => {
    const full = { ...entry('a', [720, 1080], 'Atonement'), directors: ['A', 'B'], episodes: 9, genres: ['Drama'], plot: 'p', rating: '7.8', seasons: 2, year: '2007' }
    expect(toCatalogItem(full, 'abc')).toStrictEqual({ date: '2007', directors: 'A, B', eps: 9, genre: 'Drama', img: 'abc', name: 'Atonement', plot: 'p', quality: '1080p · 720p', rating: '7.8', seasons: 2 })
  })

  it('toCatalogItem B minimal entry', () => {
    expect(toCatalogItem(entry('a', []))).toStrictEqual({ name: 'a' })
  })

  it('renderCatalog A escapes closing tags and dollar signs', () => {
    const html = renderCatalog(template, { generated: new Date('2026-10-23T10:00:00Z'), movies: [{ name: '</script> $& end' }], shows: [] })
    expect(html).toBe(String.raw`<html><script>const DATA={"generated":"2026-10-23T10:00:00.000Z","movies":[{"name":"<\/script> $& end"}],"shows":[]}</script></html>`)
  })

  it('renderCatalog B template without placeholder', () => {
    expect(() => renderCatalog('<html></html>', { generated: new Date(), movies: [], shows: [] })).toThrow('__DATA__')
  })
})
