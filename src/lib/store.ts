// État de l'application : compte, préférences, catalogue, favoris, lecture en cours.

import { useMemo, useSyncExternalStore } from 'react'
import { clearAll, read, write } from './db'
import {
  groupChannels, langGroup, pickVariant, toFilms, toSeries,
  type Channel, type Film, type LangFilter, type Quality, type Series, type Sort,
} from './normalize'
import {
  fetchAccount, fetchLiveCategories, fetchLiveStreams, fetchSeries, fetchSeriesCategories,
  fetchVodCategories, fetchVodStreams,
  type Account, type AccountInfo, type MediaKind,
} from './xtream'
import { fetchPublicLists, type PublicLists } from './tmdb'

export interface Prefs {
  /** '' = français et anglais ensemble */
  lang: LangFilter
  /** contenus dans d'autres langues : masqués par défaut */
  otherLangs: boolean
  quality: Quality | 'auto'
  /** tri des grilles de films et de séries */
  sort: Sort
  /** clé TMDB de l'utilisateur, pour les notes réelles du public ; vide = désactivé */
  tmdbKey: string
}

export interface Favorites {
  /** clé de chaîne (langue + nom), stable d'une mise à jour du catalogue à l'autre */
  channels: string[]
  films: number[]
  series: number[]
}

export type Load = 'idle' | 'loading' | 'ready' | 'error'

export type Tab = 'home' | 'live' | 'films' | 'shows' | 'search' | 'settings'

/** Film ou épisode à lire. */
export interface Media {
  kind: MediaKind
  id: number
  ext: string
  title: string
  subtitle: string
  icon: string
}

export type Now =
  | { kind: 'live'; channel: Channel; variantId: number; queue: Channel[] }
  | { kind: 'vod'; media: Media }

export type Detail = { type: 'film'; film: Film } | { type: 'series'; series: Series }

export interface State {
  booted: boolean
  tab: Tab
  account: Account | null
  info: AccountInfo | null
  prefs: Prefs
  favorites: Favorites
  channels: Channel[]
  films: Film[]
  series: Series[]
  live: Load
  vod: Load
  shows: Load
  liveError: string
  vodError: string
  showsError: string
  /** listes TMDB (tendances, à l'affiche, mieux notés) ; null sans clé */
  publicLists: PublicLists | null
  publicLoad: Load
  publicError: string
  loadedAt: number
  now: Now | null
  /** fiche ouverte */
  detail: Detail | null
}

interface Cached<T> {
  v: number
  at: number
  items: T[]
}

// À augmenter quand la forme des entrées change : le cache d'une version précédente est ignoré et retéléchargé.
const CACHE_VERSION = 2

async function readCache<T>(key: string): Promise<Cached<T> | undefined> {
  const cached = await read<Cached<T>>(key)
  return cached?.v === CACHE_VERSION ? cached : undefined
}

const DAY = 24 * 60 * 60 * 1000
const DEFAULT_PREFS: Prefs = { lang: '', otherLangs: false, quality: 'auto', sort: 'recent', tmdbKey: '' }
const NO_FAVORITES: Favorites = { channels: [], films: [], series: [] }
const EMPTY = {
  channels: [], films: [], series: [], live: 'idle', vod: 'idle', shows: 'idle',
  liveError: '', vodError: '', showsError: '', publicLists: null, publicLoad: 'idle', publicError: '',
  loadedAt: 0, now: null, detail: null,
} satisfies Partial<State>

let state: State = { booted: false, tab: 'home', account: null, info: null, prefs: DEFAULT_PREFS, favorites: NO_FAVORITES, ...EMPTY }
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

export function useStore<T>(selector: (state: State) => T): T {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => selector(state),
  )
}

/** Catalogue sans les autres langues, sauf si l'utilisateur les a réactivées dans les réglages. */
export function useVisible<T extends { lang: string }>(items: T[]): T[] {
  const others = useStore((current) => current.prefs.otherLangs)
  return useMemo(() => (others ? items : items.filter((item) => langGroup(item.lang) !== 'other')), [items, others])
}

const message = (error: unknown) => (error instanceof Error ? error.message : 'Erreur inconnue.')

async function loadLive(account: Account, force: boolean) {
  const cached = force ? undefined : await readCache<Channel>('live')
  if (cached) set({ channels: cached.items, live: 'ready', loadedAt: cached.at })
  if (cached && Date.now() - cached.at < DAY) return
  if (!cached) set({ live: 'loading', liveError: '' })
  try {
    const [categories, streams] = await Promise.all([fetchLiveCategories(account), fetchLiveStreams(account)])
    const channels = groupChannels(streams, categories)
    const at = Date.now()
    set({ channels, live: 'ready', liveError: '', loadedAt: at })
    void write('live', { v: CACHE_VERSION, at, items: channels })
  } catch (error) {
    // catalogue en cache conservé si le rafraîchissement échoue
    set({ live: state.channels.length ? 'ready' : 'error', liveError: message(error) })
  }
}

async function loadVod(account: Account, force: boolean) {
  const cached = force ? undefined : await readCache<Film>('vod')
  if (cached) set({ films: cached.items, vod: 'ready' })
  if (cached && Date.now() - cached.at < DAY) return
  if (!cached) set({ vod: 'loading', vodError: '' })
  try {
    const [categories, streams] = await Promise.all([fetchVodCategories(account), fetchVodStreams(account)])
    const films = toFilms(streams, categories)
    set({ films, vod: 'ready', vodError: '' })
    void write('vod', { v: CACHE_VERSION, at: Date.now(), items: films })
  } catch (error) {
    set({ vod: state.films.length ? 'ready' : 'error', vodError: message(error) })
  }
}

async function loadSeries(account: Account, force: boolean) {
  const cached = force ? undefined : await readCache<Series>('series')
  if (cached) set({ series: cached.items, shows: 'ready' })
  if (cached && Date.now() - cached.at < DAY) return
  if (!cached) set({ shows: 'loading', showsError: '' })
  try {
    const [categories, list] = await Promise.all([fetchSeriesCategories(account), fetchSeries(account)])
    const series = toSeries(list, categories)
    set({ series, shows: 'ready', showsError: '' })
    void write('series', { v: CACHE_VERSION, at: Date.now(), items: series })
  } catch (error) {
    set({ shows: state.series.length ? 'ready' : 'error', showsError: message(error) })
  }
}

const HALF_DAY = DAY / 2

/** Notes du public : sans clé TMDB, rien n'est demandé et l'accueil se contente des notes du fournisseur. */
export async function loadPublic(force = false) {
  const key = state.prefs.tmdbKey.trim()
  if (!key) return set({ publicLists: null, publicLoad: 'idle', publicError: '' })
  const cached = force ? undefined : await read<{ at: number; lists: PublicLists }>('tmdb')
  if (cached) set({ publicLists: cached.lists, publicLoad: 'ready' })
  if (cached && Date.now() - cached.at < HALF_DAY) return
  if (!cached) set({ publicLoad: 'loading', publicError: '' })
  try {
    const lists = await fetchPublicLists(key)
    set({ publicLists: lists, publicLoad: 'ready', publicError: '' })
    void write('tmdb', { at: Date.now(), lists })
  } catch (error) {
    set({ publicLoad: state.publicLists ? 'ready' : 'error', publicError: message(error) })
  }
}

let loading: Promise<void> | null = null

/** Chaînes d'abord : l'application est utilisable avant la fin du téléchargement des films et des séries. */
export function loadCatalog(force = false): Promise<void> {
  const account = state.account
  if (!account) return Promise.resolve()
  loading ??= (async () => {
    await loadLive(account, force)
    await loadVod(account, force)
    await loadSeries(account, force)
  })().finally(() => {
    loading = null
  })
  return loading
}

export async function boot() {
  const [account, prefs, favorites] = await Promise.all([
    read<Account>('account'), read<Prefs>('prefs'), read<Favorites>('favorites'),
  ])
  // ancienne préférence : une étiquette brute (« FR », « UK ») au lieu d'un groupe de langue
  const saved = String(prefs?.lang ?? '')
  const group = saved === 'fr' || saved === 'en' ? saved : langGroup(saved)
  set({
    booted: true, account: account ?? null,
    prefs: { ...DEFAULT_PREFS, ...prefs, lang: group === 'fr' || group === 'en' ? group : '' },
    favorites: { ...NO_FAVORITES, ...favorites },
  })
  if (!account) return
  void loadCatalog()
  void loadPublic()
  fetchAccount(account).then((info) => set({ info })).catch(() => {})
}

/** Vérifie les identifiants avant de les enregistrer. Lève XtreamError si le fournisseur refuse. */
export async function connect(account: Account) {
  const info = await fetchAccount(account)
  await write('account', account)
  set({ account, info })
  void loadCatalog(true)
}

export function setPrefs(patch: Partial<Prefs>) {
  const prefs = { ...state.prefs, ...patch }
  set({ prefs })
  void write('prefs', prefs)
}

export function toggleFavorite<K extends keyof Favorites>(kind: K, id: Favorites[K][number]) {
  const current = state.favorites[kind] as (string | number)[]
  const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
  const favorites = { ...state.favorites, [kind]: next }
  set({ favorites })
  void write('favorites', favorites)
}

export function useFavorite<K extends keyof Favorites>(kind: K, id: Favorites[K][number]): boolean {
  return useStore((current) => (current.favorites[kind] as (string | number)[]).includes(id))
}

export async function signOut() {
  await clearAll()
  set({ tab: 'home', account: null, info: null, prefs: DEFAULT_PREFS, favorites: NO_FAVORITES, ...EMPTY })
}

export function playChannel(channel: Channel, queue: Channel[], quality?: Quality) {
  const variant = pickVariant(channel.variants, quality ?? state.prefs.quality)
  set({ now: { kind: 'live', channel, variantId: variant.id, queue } })
}

export function setVariant(variantId: number) {
  if (state.now?.kind === 'live') set({ now: { ...state.now, variantId } })
}

export function playMedia(media: Media) {
  set({ now: { kind: 'vod', media }, detail: null })
}

export function openDetail(detail: Detail | null) {
  set({ detail })
}

export function zap(step: 1 | -1) {
  const now = state.now
  if (now?.kind !== 'live' || now.queue.length < 2) return
  const index = now.queue.findIndex((channel) => channel.key === now.channel.key)
  const next = now.queue[(index + step + now.queue.length) % now.queue.length]
  playChannel(next, now.queue)
}

/** Lecture hors rendu, pour les écouteurs d'événements. */
export const currentTab = () => state.tab

export function setTab(tab: Tab) {
  set({ tab })
}

export function stop() {
  set({ now: null })
}
