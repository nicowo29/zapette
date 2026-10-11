// Lecture des noms du fournisseur : langue, qualité, nom propre, événement.
// Exemples réels : « |FR| TF1 ᵁᴴᴰ », « FR| Ligue 1+ 6 ʜᴅ », « FR - Le Labyrinthe (2014) MULTI »,
// « End | FocuSport FC vs. Rahimo FC | Ligue 1 - Burkina Faso | IT ».

import type { RawCategory, RawLive, RawSeries, RawVod } from './xtream'

export type Quality = 'UHD' | 'FHD' | 'HD' | 'SD' | ''

export interface EventInfo {
  detail: string
  ended: boolean
}

export interface ParsedName {
  lang: string
  quality: Quality
  title: string
  year: number | null
  tags: string[]
  event: EventInfo | null
}

export interface Variant {
  id: number
  quality: Quality
}

export interface Channel {
  key: string
  title: string
  lang: string
  category: string
  icon: string
  event: EventInfo | null
  search: string
  variants: Variant[]
}

export interface Film {
  id: number
  title: string
  lang: string
  quality: Quality
  year: number | null
  tags: string[]
  icon: string
  ext: string
  category: string
  added: number
  /** note sur 10, 0 si le fournisseur n'en donne pas */
  rating: number
  search: string
  inApp: boolean
}

export interface Series {
  id: number
  title: string
  lang: string
  year: number | null
  icon: string
  category: string
  added: number
  /** note sur 10, 0 si le fournisseur n'en donne pas */
  rating: number
  search: string
}

// Petites capitales : aucune décomposition Unicode, donc table à la main.
const SMALL_CAPS: Record<string, string> = {
  ᴀ: 'A', ʙ: 'B', ᴄ: 'C', ᴅ: 'D', ᴇ: 'E', ꜰ: 'F', ɢ: 'G', ʜ: 'H', ɪ: 'I', ᴊ: 'J', ᴋ: 'K', ʟ: 'L', ᴍ: 'M',
  ɴ: 'N', ᴏ: 'O', ᴘ: 'P', ǫ: 'Q', ʀ: 'R', ꜱ: 'S', ᴛ: 'T', ᴜ: 'U', ᴠ: 'V', ᴡ: 'W', ʏ: 'Y', ᴢ: 'Z',
}
const SMALL_CAPS_PATTERN = new RegExp(`[${Object.keys(SMALL_CAPS).join('')}]`, 'g')

/** Écritures décoratives ramenées à des lettres ordinaires ; accents conservés. */
export function plain(text: string): string {
  return text.replace(SMALL_CAPS_PATTERN, (char) => SMALL_CAPS[char]).normalize('NFKC').replace(/\s+/g, ' ').trim()
}

/** Clé de recherche : sans accents, sans majuscules, sans écritures décoratives. */
export function fold(text: string): string {
  return plain(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const LANG_PREFIX = /^(?:[|[(]\s*)?([A-Z]{2,4})\s*(?:[|\])▎:])\s*|^([A-Z]{2,3})\s+-\s+/
const QUALITY_TOKENS = /\b(UHD|4K|FHD|1080[pP]?|HD|720[pP]?|SD|HEVC|H\.?26[45]|RAW|BACKUP)\b/g
const FILM_TAGS = /\b(MULTI|VOSTFR|TRUEFRENCH|VFF|VFQ|VF|HDTS|HDCAM)\b/g
const YEAR = /\((19\d{2}|20\d{2})\)|\s-\s(19\d{2}|20\d{2})(?=\s|$)/
const VERSUS = /\s(?:vs\.?|v\.)\s/i
const ENDED = /^(end|ended|finished|termin[ée])$/i
const EVENT_CATEGORY = /event|evenement|ppv|match/

function qualityOf(text: string): Quality {
  if (/\b(UHD|4K)\b/.test(text)) return 'UHD'
  if (/\b(FHD|1080[pP]?)\b/.test(text)) return 'FHD'
  if (/\b(HD|720[pP]?)\b/.test(text)) return 'HD'
  if (/\bSD\b/.test(text)) return 'SD'
  return ''
}

const tidy = (text: string) =>
  text.replace(/\(\s*\)|\[\s*\]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s|:\-–]+|[\s|:\-–]+$/g, '')

export function parseName(raw: string, categoryName = ''): ParsedName {
  let rest = plain(raw)
  let lang = ''
  let event: EventInfo | null = null

  // Événement découpé par des barres : statut, affiche, compétition, langue.
  const parts = rest.split('|').map((part) => part.trim()).filter(Boolean)
  const versusPart = parts.find((part) => VERSUS.test(` ${part} `))
  if (versusPart && parts.length > 1) {
    const others = parts.filter((part) => part !== versusPart)
    const code = others.find((part) => /^[A-Z]{2,4}$/.test(part))
    lang = code ?? ''
    const ended = others.some((part) => ENDED.test(part))
    event = { ended, detail: others.filter((part) => part !== code && !ENDED.test(part)).join(' · ') }
    rest = versusPart
  } else {
    const prefix = LANG_PREFIX.exec(rest)
    if (prefix) {
      lang = prefix[1] ?? prefix[2]
      rest = rest.slice(prefix[0].length)
    }
    if (VERSUS.test(` ${rest} `) || EVENT_CATEGORY.test(fold(categoryName))) event = { ended: false, detail: '' }
  }
  if (!lang) {
    const fromCategory = LANG_PREFIX.exec(plain(categoryName))
    if (fromCategory) lang = fromCategory[1] ?? fromCategory[2]
  }

  const quality = qualityOf(rest)
  rest = rest.replace(QUALITY_TOKENS, ' ')

  const tags = rest.match(FILM_TAGS) ?? []
  rest = rest.replace(FILM_TAGS, ' ')

  const yearMatch = YEAR.exec(rest)
  const year = yearMatch ? Number(yearMatch[1] ?? yearMatch[2]) : null
  if (yearMatch) rest = rest.replace(yearMatch[0], ' ')

  return { lang, quality, title: tidy(rest) || plain(raw), year, tags: [...new Set(tags)], event }
}

/** « |FR| GÉNÉRALISTES » devient « Généralistes » : la langue a déjà son filtre. */
export function categoryLabel(raw: string): string {
  const label = tidy(plain(raw).replace(LANG_PREFIX, ''))
  if (!label || label !== label.toUpperCase()) return label
  return label[0] + label.slice(1).toLowerCase()
}

interface CategoryName {
  raw: string
  label: string
}

const categoryNames = (categories: RawCategory[]) =>
  new Map<string, CategoryName>(
    categories.map((category) => [
      String(category.category_id),
      { raw: category.category_name, label: categoryLabel(category.category_name) },
    ]),
  )
const NO_CATEGORY: CategoryName = { raw: '', label: '' }

/** Une chaîne = une ligne : les variantes de qualité d'un même nom sont regroupées. */
export function groupChannels(streams: RawLive[], categories: RawCategory[]): Channel[] {
  const names = categoryNames(categories)
  const groups = new Map<string, Channel>()
  for (const stream of streams) {
    if (!stream.name) continue
    const category = names.get(String(stream.category_id)) ?? NO_CATEGORY
    const parsed = parseName(stream.name, category.raw)
    const key = `${parsed.lang}|${fold(parsed.title)}`
    const variant: Variant = { id: stream.stream_id, quality: parsed.quality }
    const existing = groups.get(key)
    if (existing) {
      existing.variants.push(variant)
      if (!existing.icon && stream.stream_icon) existing.icon = stream.stream_icon
      continue
    }
    groups.set(key, {
      key,
      title: parsed.title,
      lang: parsed.lang,
      category: category.label,
      icon: stream.stream_icon ?? '',
      event: parsed.event,
      search: fold(`${parsed.title} ${parsed.event?.detail ?? ''} ${category.label}`),
      variants: [variant],
    })
  }
  return [...groups.values()]
}

/** Note sur 10 : champ `rating`, sinon `rating_5based` doublé. */
export function ratingOf(raw: { rating?: string | number | null; rating_5based?: string | number | null }): number {
  const value = Number(raw.rating) || Number(raw.rating_5based) * 2 || 0
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10))
}

export type Sort = 'recent' | 'rating' | 'year' | 'title'

interface Sortable {
  added: number
  rating: number
  year: number | null
  search: string
}

/** Tri d'une copie. À égalité, les ajouts récents passent devant. */
export function sortItems<T extends Sortable>(items: T[], sort: Sort): T[] {
  const recent = (a: T, b: T) => b.added - a.added
  const compare: Record<Sort, (a: T, b: T) => number> = {
    recent,
    rating: (a, b) => b.rating - a.rating || recent(a, b),
    year: (a, b) => (b.year ?? 0) - (a.year ?? 0) || recent(a, b),
    // clé de recherche = titre sans accents ni majuscules : ordre alphabétique sans appel coûteux
    title: (a, b) => (a.search < b.search ? -1 : a.search > b.search ? 1 : 0),
  }
  return [...items].sort(compare[sort])
}

const IN_APP_EXTENSIONS = new Set(['mp4', 'm4v', 'mov'])

/** Conteneurs que Safari sait lire. Les autres (mkv, ts, avi) partent vers VLC. */
export const playsInApp = (extension: string) => IN_APP_EXTENSIONS.has(extension.toLowerCase())

export function toSeries(list: RawSeries[], categories: RawCategory[]): Series[] {
  const names = categoryNames(categories)
  const series: Series[] = []
  for (const raw of list) {
    if (!raw.name) continue
    const category = names.get(String(raw.category_id)) ?? NO_CATEGORY
    const parsed = parseName(raw.name, category.raw)
    series.push({
      id: raw.series_id,
      title: parsed.title,
      lang: parsed.lang,
      year: parsed.year,
      icon: raw.cover ?? '',
      category: category.label,
      added: Number(raw.last_modified) || 0,
      rating: ratingOf(raw),
      search: fold(`${parsed.title} ${parsed.year ?? ''}`),
    })
  }
  return series
}

export function toFilms(streams: RawVod[], categories: RawCategory[]): Film[] {
  const names = categoryNames(categories)
  const films: Film[] = []
  for (const stream of streams) {
    if (!stream.name) continue
    const category = names.get(String(stream.category_id)) ?? NO_CATEGORY
    const parsed = parseName(stream.name, category.raw)
    const ext = String(stream.container_extension ?? 'mp4').toLowerCase()
    films.push({
      id: stream.stream_id,
      title: parsed.title,
      lang: parsed.lang,
      quality: parsed.quality,
      year: parsed.year,
      tags: parsed.tags,
      icon: stream.stream_icon ?? '',
      ext,
      category: category.label,
      added: Number(stream.added) || 0,
      rating: ratingOf(stream),
      search: fold(`${parsed.title} ${parsed.year ?? ''}`),
      inApp: playsInApp(ext),
    })
  }
  return films
}

// Ordre de démarrage : la HD part plus vite que l'UHD (1,7 s contre 3,9 s mesurés).
const START_ORDER: Quality[] = ['FHD', 'HD', '', 'UHD', 'SD']

export function pickVariant(variants: Variant[], preferred: Quality | 'auto'): Variant {
  if (preferred !== 'auto') {
    const exact = variants.find((variant) => variant.quality === preferred)
    if (exact) return exact
  }
  return [...variants].sort((a, b) => START_ORDER.indexOf(a.quality) - START_ORDER.indexOf(b.quality))[0]
}

export function qualitiesOf(variants: Variant[]): Quality[] {
  const order: Quality[] = ['UHD', 'FHD', 'HD', 'SD', '']
  return order.filter((quality) => variants.some((variant) => variant.quality === quality))
}

export type LangGroup = 'fr' | 'en' | 'other' | ''
export type LangFilter = '' | 'fr' | 'en'

const FRENCH_TAGS = new Set(['FR', 'FRA', 'FRE', 'VF', 'QC'])
const ENGLISH_TAGS = new Set(['EN', 'ENG', 'UK', 'GB', 'US', 'USA', 'CA', 'AU', 'IE', 'NZ'])
// Codes de pays et de langues courants chez les fournisseurs. Une étiquette absente de ces listes
// (« VIP », « VOD », « PPV »…) n'est pas une langue : son contenu reste visible.
const OTHER_TAGS = new Set(
  ('AD AE AF AL AM AO AR AT AZ BA BD BE BG BH BO BR BY CH CL CN CO CR CU CY CZ DE DK DO DZ EC EE EG ES ET FI GE GH GR GT ' +
    'HK HR HU ID IL IN IQ IR IS IT JO JP KE KR KU KW KZ LB LK LT LU LV LY MA MD ME MK MT MX MY NG NL NO NP PA PE PH PK PL PS ' +
    'PT PY QA RO RS RU SA SE SG SI SK SN SO SR SY TH TN TR TW UA UY UZ VE VN YE ZA ' +
    'ALB ARA ARB BRA CHN DEU ESP EXYU GER GRE HIN IND ITA KUR LAT NED PAK POL POR RUS SCA TUR').split(' '),
)

export function langGroup(tag: string): LangGroup {
  if (FRENCH_TAGS.has(tag)) return 'fr'
  if (ENGLISH_TAGS.has(tag)) return 'en'
  return OTHER_TAGS.has(tag) ? 'other' : ''
}

/** Un contenu sans langue reconnue reste visible quel que soit le filtre : impossible de savoir ce qu'il est. */
export function inLanguage(tag: string, filter: LangFilter): boolean {
  const group = langGroup(tag)
  return !filter || group === filter || group === ''
}

/** Langues présentes, de la plus fournie à la moins fournie. */
export function languagesOf(items: { lang: string }[], limit = 12): string[] {
  const counts = new Map<string, number>()
  for (const item of items) if (item.lang) counts.set(item.lang, (counts.get(item.lang) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([lang]) => lang)
}
