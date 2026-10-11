import { describe, expect, it } from 'vitest'
import type { Film, Series } from './normalize'
import { dedupe, essentials, nowShowing, providerShelves, seededShuffle, seriesOfTheMoment } from './picks'

let nextId = 1
function film(title: string, patch: Partial<Film> = {}): Film {
  return {
    id: nextId++, title, lang: 'FR', quality: 'HD', year: 2026, tags: [], icon: '', ext: 'mp4', category: 'Action',
    added: nextId, rating: 7, search: `${title.toLowerCase()} ${patch.year ?? 2026}`, inApp: true, ...patch,
  }
}

describe('dedupe', () => {
  it('garde la copie lisible dans l\'application', () => {
    const copies = [film('Dune', { ext: 'mkv', inApp: false, quality: 'UHD' }), film('Dune', { quality: 'HD' })]
    expect(dedupe(copies)).toHaveLength(1)
    expect(dedupe(copies)[0].inApp).toBe(true)
  })
  it('à lisibilité égale, garde la meilleure qualité', () => {
    expect(dedupe([film('Dune', { quality: 'HD' }), film('Dune', { quality: 'UHD' })])[0].quality).toBe('UHD')
  })
  it('ne confond pas deux films de même titre et d\'années différentes', () => {
    expect(dedupe([film('Dune', { year: 1984 }), film('Dune', { year: 2021 })])).toHaveLength(2)
  })
})

describe('nowShowing', () => {
  const films = [
    film('Ancien', { year: 2019, rating: 8 }),
    film('Mal noté', { rating: 4.5 }),
    film('Note suspecte', { rating: 10 }),
    film('Filmé en salle', { tags: ['HDTS'], rating: 8 }),
    film('Sans année', { year: null, rating: 8 }),
    film('Sortie A', { year: 2025, rating: 6.4, added: 100 }),
    film('Sortie B', { year: 2026, rating: 7.9, added: 200 }),
  ]
  it('ne retient que les sorties récentes, bien notées et regardables', () => {
    expect(nowShowing(films, 2026, 10).map((entry) => entry.title)).toEqual(['Sortie B', 'Sortie A'])
  })
  it('respecte la limite', () => {
    expect(nowShowing(films, 2026, 1)).toHaveLength(1)
  })
})

describe('essentials', () => {
  const films = [
    film('Classique A', { year: 1994, rating: 8.7 }),
    film('Classique B', { year: 2010, rating: 8.1 }),
    film('Moyen', { year: 2001, rating: 6.9 }),
    film('Trop récent', { year: 2026, rating: 8.5 }),
  ]
  it('retient les films très bien notés des années passées', () => {
    expect(essentials(films, 2026, 1, 10).map((entry) => entry.title).sort()).toEqual(['Classique A', 'Classique B'])
  })
  it('donne la même sélection pour une même graine', () => {
    expect(essentials(films, 2026, 42, 10)).toEqual(essentials(films, 2026, 42, 10))
  })
})

describe('seededShuffle', () => {
  const items = Array.from({ length: 30 }, (_, index) => index)
  it('garde tous les éléments', () => {
    expect([...seededShuffle(items, 7)].sort((a, b) => a - b)).toEqual(items)
  })
  it('change avec la graine', () => {
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2))
  })
})

describe('providerShelves', () => {
  it('reprend les rayons composés par le fournisseur', () => {
    const films = [
      film('A', { category: 'Nouveautés 2026' }),
      film('B', { category: 'Box office' }),
      film('C', { category: 'Comédie' }),
    ]
    expect(providerShelves(films, 3, 10).map((shelf) => shelf.title)).toEqual(['Nouveautés 2026', 'Box office'])
  })
})

describe('seriesOfTheMoment', () => {
  it('classe les séries bien notées par mise à jour récente', () => {
    const entry = (title: string, rating: number, added: number): Series =>
      ({ id: nextId++, title, lang: 'FR', year: 2024, icon: '', category: '', added, rating, search: title.toLowerCase() })
    const picks = seriesOfTheMoment([entry('Vieille', 8, 1), entry('Fraîche', 7.5, 9), entry('Faible', 5, 10)], 10)
    expect(picks.map((item) => item.title)).toEqual(['Fraîche', 'Vieille'])
  })
})
