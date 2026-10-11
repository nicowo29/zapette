import { describe, expect, it } from 'vitest'
import type { Film } from './normalize'
import { byPublicRating, matchCatalog, weighted, type PublicFilm } from './tmdb'

let nextId = 1
const film = (title: string, year: number | null, patch: Partial<Film> = {}): Film => ({
  id: nextId++, title, lang: 'FR', quality: 'HD', year, tags: [], icon: '', ext: 'mp4', category: '',
  added: 0, rating: 0, search: `${title.toLowerCase()} ${year ?? ''}`, inApp: true, ...patch,
})
const publicFilm = (title: string, year: number, rating: number, votes: number, original = title): PublicFilm =>
  ({ title, original, year, rating, votes })

describe('weighted', () => {
  it('fait passer un film très voté devant un film mieux noté mais confidentiel', () => {
    expect(weighted(8.5, 20000)).toBeGreaterThan(weighted(9, 40))
  })
})

describe('matchCatalog', () => {
  const catalog = [
    film('Dune : Deuxième partie', 2024, { ext: 'mkv', inApp: false }),
    film('Dune : Deuxième partie', 2024),
    film('Oppenheimer', 2023),
    film('Heat', 1995),
    film('Heat', 2013),
    film('Sans année', null),
  ]

  it('retrouve un film par son titre français, sans tenir compte des accents ni des majuscules', () => {
    const picks = matchCatalog([publicFilm('DUNE : DEUXIEME PARTIE', 2024, 8.2, 6000)], catalog)
    expect(picks).toHaveLength(1)
    expect(picks[0]).toMatchObject({ rating: 8.2, votes: 6000 })
  })
  it('garde la copie lisible dans l\'application', () => {
    expect(matchCatalog([publicFilm('Dune : Deuxième partie', 2024, 8.2, 6000)], catalog)[0].film.inApp).toBe(true)
  })
  it('retrouve un film par son titre original', () => {
    expect(matchCatalog([publicFilm('Titre traduit', 2023, 8.1, 9000, 'Oppenheimer')], catalog)).toHaveLength(1)
  })
  it('distingue deux films de même titre par l\'année', () => {
    expect(matchCatalog([publicFilm('Heat', 1995, 8.3, 7000)], catalog)[0].film.year).toBe(1995)
  })
  it('accepte un an d\'écart et un film sans année', () => {
    expect(matchCatalog([publicFilm('Oppenheimer', 2024, 8, 1)], catalog)).toHaveLength(1)
    expect(matchCatalog([publicFilm('Sans année', 2020, 7, 1)], catalog)).toHaveLength(1)
  })
  it('ignore un film absent du catalogue', () => {
    expect(matchCatalog([publicFilm('Introuvable', 2024, 9, 9000)], catalog)).toEqual([])
  })
  it('trie par note du public pondérée', () => {
    const picks = matchCatalog([publicFilm('Heat', 1995, 9.5, 12), publicFilm('Oppenheimer', 2023, 8.1, 9000)], catalog)
    expect(picks.sort(byPublicRating)[0].film.title).toBe('Oppenheimer')
  })
})
