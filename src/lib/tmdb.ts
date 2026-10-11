// Notes réelles du public, via TMDB (themoviedb.org). Facultatif : il faut une clé gratuite, créée par l'utilisateur.
// On ne note pas les 100 000 films du catalogue un par un : on demande à TMDB ses listes (tendances, à l'affiche,
// mieux notés) et on retrouve ces films dans le catalogue.

import { fold, type Film } from './normalize'
import { dedupe } from './picks'

export interface PublicFilm {
  title: string
  original: string
  year: number | null
  rating: number
  votes: number
}

export type PublicList = 'trending' | 'now' | 'top'
export type PublicLists = Record<PublicList, PublicFilm[]>

export interface PublicPick {
  film: Film
  rating: number
  votes: number
}

const BASE = 'https://api.themoviedb.org/3'
const PATHS: Record<PublicList, string> = { trending: 'trending/movie/week', now: 'movie/now_playing', top: 'movie/top_rated' }
const PAGES: Record<PublicList, number> = { trending: 3, now: 3, top: 10 }

export class TmdbError extends Error {}

async function fetchPage(key: string, list: PublicList, page: number): Promise<PublicFilm[]> {
  // TMDB accepte deux formes de clé : la courte en paramètre, la longue (jeton) en en-tête
  const token = key.startsWith('eyJ')
  const params = new URLSearchParams({ language: 'fr-FR', region: 'FR', page: String(page) })
  if (!token) params.set('api_key', key)
  let response: Response
  try {
    response = await fetch(`${BASE}/${PATHS[list]}?${params}`, token ? { headers: { Authorization: `Bearer ${key}` } } : undefined)
  } catch {
    throw new TmdbError('TMDB injoignable. Vérifie ta connexion.')
  }
  if (response.status === 401) throw new TmdbError('Clé TMDB refusée. Vérifie la clé copiée.')
  if (!response.ok) throw new TmdbError(`TMDB a répondu ${response.status}.`)
  const data = (await response.json()) as { results?: Record<string, unknown>[] }
  return (data.results ?? []).map((raw) => {
    const year = Number(String(raw.release_date ?? '').slice(0, 4))
    return {
      title: String(raw.title ?? ''),
      original: String(raw.original_title ?? ''),
      year: year > 1900 ? year : null,
      rating: Math.round(Number(raw.vote_average) * 10) / 10 || 0,
      votes: Number(raw.vote_count) || 0,
    }
  })
}

export async function fetchPublicLists(key: string): Promise<PublicLists> {
  const load = async (list: PublicList) =>
    (await Promise.all(Array.from({ length: PAGES[list] }, (_, index) => fetchPage(key, list, index + 1)))).flat()
  const [trending, now, top] = await Promise.all([load('trending'), load('now'), load('top')])
  return { trending, now, top }
}

/** Note pondérée par le nombre de votes : un 8,5 sur 20 000 votes passe devant un 9 sur 40 votes. */
export function weighted(rating: number, votes: number): number {
  const threshold = 300
  const average = 6.5
  return (votes / (votes + threshold)) * rating + (threshold / (votes + threshold)) * average
}

export type TitleIndex = Map<string, Film[]>

/** Catalogue rangé par titre : à construire une fois quand plusieurs listes sont à rapprocher. */
export function titleIndex(films: Film[]): TitleIndex {
  const byTitle: TitleIndex = new Map()
  for (const film of films) {
    const key = fold(film.title)
    const group = byTitle.get(key)
    if (group) group.push(film)
    else byTitle.set(key, [film])
  }
  return byTitle
}

/** Retrouve dans le catalogue les films d'une liste TMDB, par titre (français ou original) et année à un an près. */
export function matchCatalog(publicFilms: PublicFilm[], films: Film[] | TitleIndex): PublicPick[] {
  const byTitle = films instanceof Map ? films : titleIndex(films)
  const picks: PublicPick[] = []
  const seen = new Set<number>()
  for (const entry of publicFilms) {
    const candidates = (byTitle.get(fold(entry.title)) ?? byTitle.get(fold(entry.original)) ?? []).filter(
      (film) => film.year === null || entry.year === null || Math.abs(film.year - entry.year) <= 1,
    )
    const film = dedupe(candidates)[0]
    if (!film || seen.has(film.id)) continue
    seen.add(film.id)
    picks.push({ film, rating: entry.rating, votes: entry.votes })
  }
  return picks
}

export const byPublicRating = (a: PublicPick, b: PublicPick) => weighted(b.rating, b.votes) - weighted(a.rating, a.votes)
