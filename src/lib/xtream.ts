// Client de l'API Xtream Codes (player_api.php) et construction des adresses de flux.

export interface Account {
  server: string
  user: string
  pass: string
}

export interface AccountInfo {
  status: string
  expires: number | null
  maxConnections: number
}

export interface RawCategory {
  category_id: string
  category_name: string
}

export interface RawLive {
  stream_id: number
  name: string
  stream_icon?: string | null
  category_id?: string | null
}

export interface RawVod {
  stream_id: number
  name: string
  stream_icon?: string | null
  category_id?: string | null
  container_extension?: string | null
  rating?: string | number | null
  rating_5based?: string | number | null
  added?: string | number | null
}

export interface RawSeries {
  series_id: number
  name: string
  cover?: string | null
  category_id?: string | null
  last_modified?: string | number | null
  rating?: string | number | null
  rating_5based?: string | number | null
}

export interface Episode {
  id: number
  number: number
  title: string
  ext: string
  duration: string
}

export interface Season {
  number: number
  episodes: Episode[]
}

export interface SeriesInfo {
  plot: string
  genre: string
  seasons: Season[]
}

export type MediaKind = 'movie' | 'series'

export interface VodInfo {
  plot: string
  genre: string
  duration: string
  backdrop: string
}

export type XtreamErrorKind = 'auth' | 'network' | 'http' | 'format'

export class XtreamError extends Error {
  constructor(public kind: XtreamErrorKind, message: string) {
    super(message)
  }
}

export function cleanServer(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
}

export function apiUrl(account: Account, action?: string, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams({ username: account.user, password: account.pass })
  if (action) params.set('action', action)
  for (const [key, value] of Object.entries(extra)) params.set(key, String(value))
  return `${account.server}/player_api.php?${params}`
}

async function call<T>(account: Account, action?: string, extra?: Record<string, string | number>): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(account, action, extra))
  } catch {
    throw new XtreamError('network', 'Serveur injoignable. Vérifie l\'adresse et ta connexion.')
  }
  if (!response.ok) throw new XtreamError('http', `Le serveur a répondu ${response.status}.`)
  try {
    return (await response.json()) as T
  } catch {
    throw new XtreamError('format', 'Réponse illisible. Vérifie l\'adresse du serveur.')
  }
}

export async function fetchAccount(account: Account): Promise<AccountInfo> {
  const data = await call<{ user_info?: Record<string, unknown> }>(account)
  const info = data.user_info
  if (!info || String(info.auth) === '0') {
    throw new XtreamError('auth', 'Identifiants refusés. Vérifie le serveur, l\'utilisateur et le mot de passe.')
  }
  const expires = Number(info.exp_date)
  return {
    status: String(info.status ?? ''),
    expires: Number.isFinite(expires) && expires > 0 ? expires * 1000 : null,
    maxConnections: Number(info.max_connections) || 1,
  }
}

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export const fetchLiveCategories = async (a: Account) => list<RawCategory>(await call(a, 'get_live_categories'))
export const fetchLiveStreams = async (a: Account) => list<RawLive>(await call(a, 'get_live_streams'))
export const fetchVodCategories = async (a: Account) => list<RawCategory>(await call(a, 'get_vod_categories'))
export const fetchVodStreams = async (a: Account) => list<RawVod>(await call(a, 'get_vod_streams'))

export async function fetchVodInfo(account: Account, id: number): Promise<VodInfo> {
  const data = await call<{ info?: Record<string, unknown> }>(account, 'get_vod_info', { vod_id: id })
  const info = data.info ?? {}
  const backdrop = Array.isArray(info.backdrop_path) ? info.backdrop_path[0] : info.backdrop_path
  return {
    plot: String(info.plot ?? info.description ?? '').trim(),
    genre: String(info.genre ?? '').trim(),
    duration: String(info.duration ?? '').trim(),
    backdrop: typeof backdrop === 'string' ? backdrop : '',
  }
}

export const fetchSeriesCategories = async (a: Account) => list<RawCategory>(await call(a, 'get_series_categories'))
export const fetchSeries = async (a: Account) => list<RawSeries>(await call(a, 'get_series'))

export async function fetchSeriesInfo(account: Account, id: number): Promise<SeriesInfo> {
  const data = await call<{ info?: Record<string, unknown>; episodes?: Record<string, unknown> }>(
    account, 'get_series_info', { series_id: id },
  )
  const info = data.info ?? {}
  // épisodes rangés par saison : objet { "1": [...] } ou tableau de tableaux selon les fournisseurs
  const seasons: Season[] = []
  for (const [key, value] of Object.entries(data.episodes ?? {})) {
    const episodes = list<Record<string, unknown>>(value).map((raw, index) => {
      const details = (raw.info ?? {}) as Record<string, unknown>
      return {
        id: Number(raw.id),
        number: Number(raw.episode_num) || index + 1,
        title: String(raw.title ?? '').trim(),
        ext: String(raw.container_extension ?? 'mp4').toLowerCase(),
        duration: String(details.duration ?? '').trim(),
      }
    }).filter((episode) => Number.isFinite(episode.id))
    if (!episodes.length) continue
    const first = list<Record<string, unknown>>(value)[0]
    seasons.push({ number: Number(first?.season) || Number(key) || seasons.length + 1, episodes })
  }
  seasons.sort((a, b) => a.number - b.number)
  return { plot: String(info.plot ?? '').trim(), genre: String(info.genre ?? '').trim(), seasons }
}

const segment = encodeURIComponent

export function liveUrl(account: Account, id: number): string {
  return `${account.server}/live/${segment(account.user)}/${segment(account.pass)}/${id}.m3u8`
}

/** Film (`movie`) ou épisode (`series`). */
export function mediaUrl(account: Account, kind: MediaKind, id: number, extension: string): string {
  return `${account.server}/${kind}/${segment(account.user)}/${segment(account.pass)}/${id}.${extension}`
}

/** Lien qui ouvre un flux dans VLC : schéma x-callback sur iPhone, schéma vlc:// ailleurs. */
export function vlcUrl(streamUrl: string, ios: boolean): string {
  return ios ? `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}` : `vlc://${streamUrl}`
}
