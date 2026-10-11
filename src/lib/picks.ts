// Sélections de l'accueil : des films qui valent le coup, tirés du catalogue du fournisseur.
// Seules données disponibles : titre, année, note, date d'ajout, catégorie. Pas de nombre de votes.

import type { Film, Quality, Series } from './normalize'

/** Une note de 10 ou presque trahit un film noté par trois personnes ; en dessous de 5, pas la peine. */
const trusted = (rating: number) => rating >= 5 && rating < 9.6

/** Enregistrements faits en salle : image et son médiocres, jamais mis en avant. */
const CAMERA_TAGS = new Set(['HDTS', 'HDCAM'])
const watchable = (film: Film) => !film.tags.some((tag) => CAMERA_TAGS.has(tag))

const QUALITY_RANK: Quality[] = ['UHD', 'FHD', 'HD', '', 'SD']

/** Un même film existe en plusieurs copies : on garde celle qui se lit dans l'application, puis la meilleure qualité. */
export function dedupe(films: Film[]): Film[] {
  const best = new Map<string, Film>()
  for (const film of films) {
    const current = best.get(film.search)
    if (!current) {
      best.set(film.search, film)
      continue
    }
    const better =
      film.inApp !== current.inApp
        ? film.inApp
        : QUALITY_RANK.indexOf(film.quality) < QUALITY_RANK.indexOf(current.quality)
    // la copie retenue prend la place de la première : l'ordre de la liste est conservé
    if (better) best.set(film.search, film)
  }
  return [...best.values()]
}

/** Mélange reproductible : la même graine donne le même ordre, pour une sélection stable sur la journée. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items]
  let state = seed >>> 0 || 1
  for (let index = result.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const other = state % (index + 1)
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

/** Numéro du jour : la graine des sélections qui tournent. */
export const dayNumber = (date = new Date()) => Math.floor(date.getTime() / 86_400_000)

/** Sorties de l'année et de l'année précédente, bien notées, les dernières arrivées d'abord. */
export function nowShowing(films: Film[], year: number, limit: number): Film[] {
  const pool = films.filter(
    (film) => film.year !== null && film.year >= year - 1 && film.year <= year && film.rating >= 6 && trusted(film.rating) && watchable(film),
  )
  return dedupe(pool.sort((a, b) => b.added - a.added)).slice(0, limit)
}

/** Films très bien notés des années passées. La sélection change chaque jour. */
export function essentials(films: Film[], year: number, seed: number, limit: number): Film[] {
  const pool = dedupe(
    films.filter((film) => film.year !== null && film.year < year - 1 && film.rating >= 7.8 && trusted(film.rating) && watchable(film)),
  )
  return seededShuffle(pool, seed).slice(0, limit)
}

const CURATED = /nouveaut|box ?office|sorties?\b|a l'affiche|tendance|trending|populaire|top \d+|cinema 20\d\d/

export interface Shelf {
  title: string
  films: Film[]
}

/** Rayons déjà composés par le fournisseur (« Nouveautés », « Box office »…) : il connaît son catalogue. */
export function providerShelves(films: Film[], maxShelves: number, limit: number): Shelf[] {
  const groups = new Map<string, Film[]>()
  for (const film of films) {
    if (!film.category || !watchable(film)) continue
    const key = film.category.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (!CURATED.test(key)) continue
    const group = groups.get(film.category)
    if (group) group.push(film)
    else groups.set(film.category, [film])
  }
  return [...groups.entries()]
    .slice(0, maxShelves)
    .map(([title, group]) => ({ title, films: dedupe(group.sort((a, b) => b.added - a.added)).slice(0, limit) }))
}

/** Séries bien notées qui viennent de recevoir des épisodes. */
export function seriesOfTheMoment(series: Series[], limit: number): Series[] {
  return series
    .filter((entry) => entry.rating >= 7 && trusted(entry.rating))
    .sort((a, b) => b.added - a.added)
    .slice(0, limit)
}
