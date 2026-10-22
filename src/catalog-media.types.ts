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
