import type { ReactNode } from 'react'
import { playsInApp, qualitiesOf, type Channel, type Film, type Quality, type Series } from '../lib/normalize'
import { openDetail, playChannel, toggleFavorite, useFavorite, useStore, type Favorites } from '../lib/store'
import { Art } from './Art'
import { HeartIcon, StarIcon } from './Icons'

interface FavButtonProps<K extends keyof Favorites> {
  kind: K
  id: Favorites[K][number]
  label: string
}

export function FavButton<K extends keyof Favorites>({ kind, id, label }: FavButtonProps<K>) {
  const on = useFavorite(kind, id)
  return (
    <button
      className="fav" aria-pressed={on}
      aria-label={on ? `Retirer ${label} des favoris` : `Ajouter ${label} aux favoris`}
      onClick={() => toggleFavorite(kind, id)}
    >
      <HeartIcon size={22} filled={on} />
    </button>
  )
}

/** Trois barres animées : la chaîne en cours de lecture. */
export const Bars = () => <span className="bars" aria-hidden="true"><i /><i /><i /></span>

export const usePlaying = (channel: Channel) =>
  useStore((state) => state.now?.kind === 'live' && state.now.channel.key === channel.key)

interface ChannelRowProps {
  channel: Channel
  /** liste dans laquelle on zappe depuis le lecteur */
  queue: Channel[]
  /** qualité filtrée à l'écran : un tap la lance au lieu de la qualité par défaut */
  quality?: Quality
}

export function ChannelRow({ channel, queue, quality }: ChannelRowProps) {
  const playing = usePlaying(channel)
  const sub = channel.event ? channel.event.detail || 'Événement' : channel.category
  // la qualité se choisit dans le lecteur ; ici elle renseigne, sans encombrer la ligne de boutons
  const qualities = qualitiesOf(channel.variants).filter(Boolean)
  return (
    <div className="row" data-playing={playing || undefined}>
      <button className="row-main" onClick={() => playChannel(channel, queue, quality)}>
        <Art src={channel.icon} title={channel.title} shape="logo" />
        <span className="row-text">
          <span className="row-title">{playing && <Bars />}{channel.title}</span>
          <span className="row-sub">
            {channel.event?.ended && <span className="tag tag-muted">Terminé</span>}
            {channel.lang && <span className="tag">{channel.lang}</span>}
            <span className="row-sub-text">{sub}</span>
          </span>
        </span>
        {qualities.length > 0 && <span className="row-qualities">{qualities.join(' · ')}</span>}
      </button>
      <FavButton kind="channels" id={channel.key} label={channel.title} />
    </div>
  )
}

export function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <div className="skeletons" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="row skeleton-row">
          <span className="skeleton skeleton-logo" />
          <span className="row-text">
            <span className="skeleton skeleton-line" style={{ width: `${46 + ((index * 17) % 32)}%` }} />
            <span className="skeleton skeleton-line skeleton-line-short" />
          </span>
        </div>
      ))}
    </div>
  )
}

const formatRating = (rating: number) => rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function Rating({ value }: { value: number }) {
  if (!value) return null
  return <span className="rating"><StarIcon size={12} /><span className="sr-only">Note </span>{formatRating(value)}</span>
}

/** Tri par note : la note remplace l'année sous l'affiche, la place manque pour les deux. */
function CardFact({ year, rating, fallback, showRating }: { year: number | null; rating: number; fallback?: string; showRating?: boolean }) {
  const byRating = useStore((state) => state.prefs.sort === 'rating')
  if ((byRating || showRating) && rating) return <Rating value={rating} />
  return year || fallback ? <span>{year ?? fallback}</span> : null
}

export function FormatBadge({ ext }: { ext: string }) {
  return playsInApp(ext) ? <span className="tag tag-app">Dans l'app</span> : <span className="tag tag-vlc">VLC</span>
}

interface PosterCardProps {
  icon: string
  title: string
  favorite: boolean
  meta: ReactNode
  onOpen: () => void
}

function PosterCard({ icon, title, favorite, meta, onOpen }: PosterCardProps) {
  return (
    <button className="card" onClick={onOpen}>
      <span className="card-art">
        <Art src={icon} title={title} shape="poster" />
        {favorite && <span className="card-fav"><HeartIcon size={16} filled /></span>}
      </span>
      <span className="card-title">{title}</span>
      <span className="card-meta">{meta}</span>
    </button>
  )
}

interface FilmCardProps {
  film: Film
  showRating?: boolean
  /** note du public (TMDB) : elle remplace celle du fournisseur */
  rating?: number
}

export function FilmCard({ film, showRating, rating }: FilmCardProps) {
  const favorite = useFavorite('films', film.id)
  return (
    <PosterCard
      icon={film.icon} title={film.title} favorite={favorite} onOpen={() => openDetail({ type: 'film', film })}
      meta={<><CardFact year={film.year} rating={rating ?? film.rating} showRating={showRating} /><FormatBadge ext={film.ext} /></>}
    />
  )
}

export function SeriesCard({ series, showRating }: { series: Series; showRating?: boolean }) {
  const favorite = useFavorite('series', series.id)
  return (
    <PosterCard
      icon={series.icon} title={series.title} favorite={favorite} onOpen={() => openDetail({ type: 'series', series })}
      meta={<><CardFact year={series.year} rating={series.rating} fallback="Série" showRating={showRating} /></>}
    />
  )
}

interface PosterRowProps {
  icon: string
  title: string
  lang: string
  sub: string
  side: ReactNode
  onOpen: () => void
}

function PosterRow({ icon, title, lang, sub, side, onOpen }: PosterRowProps) {
  return (
    <div className="row">
      <button className="row-main" onClick={onOpen}>
        <Art src={icon} title={title} shape="poster" />
        <span className="row-text">
          <span className="row-title">{title}</span>
          <span className="row-sub">
            {lang && <span className="tag">{lang}</span>}
            <span className="row-sub-text">{sub}</span>
          </span>
        </span>
        {side}
      </button>
    </div>
  )
}

export function FilmRow({ film }: { film: Film }) {
  return (
    <PosterRow
      icon={film.icon} title={film.title} lang={film.lang}
      sub={[film.year, film.quality, ...film.tags].filter(Boolean).join(' · ') || 'Film'}
      side={<FormatBadge ext={film.ext} />} onOpen={() => openDetail({ type: 'film', film })}
    />
  )
}

export function SeriesRow({ series }: { series: Series }) {
  return (
    <PosterRow
      icon={series.icon} title={series.title} lang={series.lang}
      sub={[series.year, series.category].filter(Boolean).join(' · ') || 'Série'}
      side={null} onOpen={() => openDetail({ type: 'series', series })}
    />
  )
}
