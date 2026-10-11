import { describe, expect, it } from 'vitest'
import { categoryLabel, fold, groupChannels, inLanguage, langGroup, ratingOf, sortItems, languagesOf, parseName, pickVariant, plain, qualitiesOf, toFilms } from './normalize'

describe('plain et fold', () => {
  it('ramène les écritures décoratives à des lettres ordinaires', () => {
    expect(plain('|FR| TF1 ᵁᴴᴰ')).toBe('|FR| TF1 UHD')
    expect(plain('FR| Ligue 1+ 6 ʜᴅ')).toBe('FR| Ligue 1+ 6 HD')
  })
  it('retire accents et majuscules pour la recherche', () => {
    expect(fold('Sénégal')).toBe('senegal')
    expect(fold('TÉLÉ ᴴᴰ')).toBe('tele hd')
  })
})

describe('parseName, chaînes', () => {
  it('lit le préfixe entre barres et la qualité en exposant', () => {
    expect(parseName('|FR| TF1 ᵁᴴᴰ')).toMatchObject({ lang: 'FR', quality: 'UHD', title: 'TF1', event: null })
  })
  it('lit le préfixe à une barre et la qualité en petites capitales', () => {
    expect(parseName('FR| Ligue 1+ 6 ʜᴅ')).toMatchObject({ lang: 'FR', quality: 'HD', title: 'Ligue 1+ 6' })
  })
  it('garde le nom entier quand il n\'y a ni langue ni qualité', () => {
    expect(parseName('Arte')).toMatchObject({ lang: '', quality: '', title: 'Arte' })
  })
  it('ne prend pas un nom de chaîne pour une langue', () => {
    expect(parseName('TF1 HD')).toMatchObject({ lang: '', quality: 'HD', title: 'TF1' })
  })
  it('prend la langue dans la catégorie à défaut', () => {
    expect(parseName('M6 FHD', '|FR| GÉNÉRALISTES')).toMatchObject({ lang: 'FR', quality: 'FHD', title: 'M6' })
  })
  it('range 4K avec UHD', () => {
    expect(parseName('|ES| La Sexta 4K').quality).toBe('UHD')
  })
})

describe('parseName, événements', () => {
  it('reconnaît une affiche simple', () => {
    const parsed = parseName('France vs Senegal')
    expect(parsed.title).toBe('France vs Senegal')
    expect(parsed.event).toEqual({ ended: false, detail: '' })
  })
  it('découpe un événement terminé', () => {
    const parsed = parseName('End | FocuSport FC vs. Rahimo FC | Ligue 1 - Burkina Faso | IT')
    expect(parsed).toMatchObject({ lang: 'IT', title: 'FocuSport FC vs. Rahimo FC' })
    expect(parsed.event).toEqual({ ended: true, detail: 'Ligue 1 - Burkina Faso' })
  })
  it('garde la langue en préfixe d\'une affiche', () => {
    expect(parseName('FR| France vs Iraq ʜᴅ')).toMatchObject({ lang: 'FR', quality: 'HD', title: 'France vs Iraq' })
  })
  it('marque événement par la catégorie', () => {
    expect(parseName('UFC 300', 'PPV EVENTS').event).not.toBeNull()
  })
})

describe('parseName, films', () => {
  it('lit langue, année et étiquette', () => {
    expect(parseName('FR - Le Labyrinthe (2014) MULTI')).toMatchObject({
      lang: 'FR', title: 'Le Labyrinthe', year: 2014, tags: ['MULTI'],
    })
  })
  it('garde la ponctuation du titre', () => {
    expect(parseName('FR - Spider-Man : Brand New Day (2026)')).toMatchObject({
      lang: 'FR', title: 'Spider-Man : Brand New Day', year: 2026,
    })
  })
  it('lit l\'année après un tiret', () => {
    expect(parseName('FR - The Odyssey - 2026 HDTS')).toMatchObject({ title: 'The Odyssey', year: 2026, tags: ['HDTS'] })
  })
})

describe('groupChannels', () => {
  const categories = [{ category_id: '1', category_name: '|FR| GÉNÉRALISTES' }]
  const streams = [
    { stream_id: 1, name: '|FR| TF1 ᵁᴴᴰ', category_id: '1', stream_icon: '' },
    { stream_id: 2, name: '|FR| TF1 HD', category_id: '1', stream_icon: 'http://x/tf1.png' },
    { stream_id: 3, name: '|FR| TF1 FHD', category_id: '1' },
    { stream_id: 4, name: '|ES| La Sexta ᵁᴴᴰ', category_id: '9' },
    { stream_id: 5, name: '|ES| LA SEXTA ᵁᴴᴰ', category_id: '9' },
  ]
  const channels = groupChannels(streams, categories)

  it('regroupe les qualités d\'une même chaîne', () => {
    expect(channels).toHaveLength(2)
    expect(channels[0]).toMatchObject({ title: 'TF1', lang: 'FR', icon: 'http://x/tf1.png', category: 'Généralistes' })
    expect(qualitiesOf(channels[0].variants)).toEqual(['UHD', 'FHD', 'HD'])
  })
  it('regroupe sans tenir compte des majuscules', () => {
    expect(channels[1].variants).toHaveLength(2)
  })
  it('lance la qualité la plus rapide par défaut, ou celle demandée', () => {
    expect(pickVariant(channels[0].variants, 'auto').id).toBe(3)
    expect(pickVariant(channels[0].variants, 'UHD').id).toBe(1)
    expect(pickVariant(channels[1].variants, 'HD').id).toBe(4)
  })
  it('classe les langues par nombre de chaînes', () => {
    expect(languagesOf([{ lang: 'ES' }, { lang: 'FR' }, { lang: 'FR' }, { lang: '' }])).toEqual(['FR', 'ES'])
  })
})

describe('categoryLabel', () => {
  it('retire la langue et les capitales criardes', () => {
    expect(categoryLabel('|FR| GÉNÉRALISTES')).toBe('Généralistes')
    expect(categoryLabel('FR - ACTION')).toBe('Action')
    expect(categoryLabel('Sports & Loisirs')).toBe('Sports & Loisirs')
  })
})

describe('langGroup et inLanguage', () => {
  it('range les étiquettes françaises et anglaises', () => {
    expect(langGroup('FR')).toBe('fr')
    expect(['UK', 'US', 'EN'].map(langGroup)).toEqual(['en', 'en', 'en'])
  })
  it('range les autres langues à part', () => {
    expect(['ES', 'IT', 'AR', 'DE'].map(langGroup)).toEqual(['other', 'other', 'other', 'other'])
  })
  it('ne prend pas une étiquette quelconque pour une langue', () => {
    expect(langGroup('VIP')).toBe('')
    expect(langGroup('')).toBe('')
  })
  it('filtre par langue en gardant le contenu sans langue', () => {
    expect(inLanguage('FR', 'fr')).toBe(true)
    expect(inLanguage('UK', 'fr')).toBe(false)
    expect(inLanguage('', 'fr')).toBe(true)
    expect(inLanguage('ES', '')).toBe(true)
  })
})

describe('ratingOf', () => {
  it('lit la note sur 10', () => {
    expect(ratingOf({ rating: '7.84' })).toBe(7.8)
  })
  it('double la note sur 5 à défaut', () => {
    expect(ratingOf({ rating: '', rating_5based: 4 })).toBe(8)
  })
  it('vaut 0 sans note', () => {
    expect(ratingOf({})).toBe(0)
  })
})

describe('sortItems', () => {
  const items = [
    { id: 'a', added: 1, rating: 9, year: 2001, search: 'zorro' },
    { id: 'b', added: 3, rating: 0, year: null, search: 'amelie' },
    { id: 'c', added: 2, rating: 9, year: 2020, search: 'matrix' },
  ]
  const order = (sort: Parameters<typeof sortItems>[1]) => sortItems(items, sort).map((item) => item.id).join('')

  it('ajouts récents', () => expect(order('recent')).toBe('bca'))
  it('mieux notés, le plus récent devant à égalité', () => expect(order('rating')).toBe('cab'))
  it('année de sortie, sans année en dernier', () => expect(order('year')).toBe('cab'))
  it('de A à Z', () => expect(order('title')).toBe('bca'))
  it('ne modifie pas la liste d\'origine', () => {
    sortItems(items, 'title')
    expect(items[0].id).toBe('a')
  })
})

describe('toFilms', () => {
  it('distingue ce qui se lit dans l\'application', () => {
    const films = toFilms(
      [
        { stream_id: 1, name: 'FR - Intouchables (2011)', container_extension: 'mp4', added: '1700000000' },
        { stream_id: 2, name: 'FR - Le Labyrinthe (2014) MULTI', container_extension: 'mkv' },
      ],
      [],
    )
    expect(films[0]).toMatchObject({ title: 'Intouchables', inApp: true, added: 1700000000 })
    expect(films[1]).toMatchObject({ inApp: false, ext: 'mkv' })
  })
})
