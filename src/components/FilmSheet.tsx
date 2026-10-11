import { useEffect, useState, type ReactNode } from 'react'
import { playsInApp, type Film, type Series } from '../lib/normalize'
import { ios } from '../lib/platform'
import { openDetail, playMedia, type Media } from '../lib/store'
import {
  fetchSeriesInfo, fetchVodInfo, mediaUrl, vlcUrl,
  type Account, type Episode, type SeriesInfo, type VodInfo,
} from '../lib/xtream'
import { Art } from './Art'
import { CloseIcon, OutIcon, PlayIcon } from './Icons'
import { FavButton, FormatBadge, Rating } from './Rows'

interface SheetProps {
  label: string
  /** affiche : elle teinte le haut de la fiche */
  art: string
  /** bouton favori, placé à côté de la fermeture */
  favorite: ReactNode
  children: ReactNode
}

function Sheet({ label, art, favorite, children }: SheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && openDetail(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="sheet-backdrop" onClick={() => openDetail(null)}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(event) => event.stopPropagation()}>
        {art && <span className="sheet-ambient" aria-hidden="true"><span className="ambient" style={{ backgroundImage: `url("${art}")` }} /></span>}
        <div className="sheet-buttons">
          {favorite}
          <button className="icon-button" aria-label="Fermer la fiche" onClick={() => openDetail(null)}><CloseIcon /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FilmSheet({ film, account }: { film: Film; account: Account }) {
  const [info, setInfo] = useState<VodInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const url = mediaUrl(account, 'movie', film.id, film.ext)
  const media: Media = {
    kind: 'movie', id: film.id, ext: film.ext, title: film.title, icon: film.icon,
    subtitle: [film.year, 'Film'].filter(Boolean).join(' · '),
  }

  useEffect(() => {
    let active = true
    setInfo(null)
    // fiche facultative : le film reste lançable si le fournisseur ne la donne pas
    fetchVodInfo(account, film.id).then((value) => active && setInfo(value)).catch(() => {})
    return () => {
      active = false
    }
  }, [account, film.id])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const facts = [film.year, film.quality, info?.duration, info?.genre, film.category].filter(Boolean)

  return (
    <Sheet label={film.title} art={film.icon} favorite={<FavButton kind="films" id={film.id} label={film.title} />}>
      <div className="sheet-head">
        <Art src={film.icon} title={film.title} shape="poster" />
        <div className="sheet-info">
          <h2>{film.title}</h2>
          <p className="sheet-facts"><Rating value={film.rating} />{facts.join(' · ')}</p>
          <p className="sheet-tags">
            {film.lang && <span className="tag">{film.lang}</span>}
            {film.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
            <FormatBadge ext={film.ext} />
          </p>
        </div>
      </div>
      {info?.plot && <p className="sheet-plot">{info.plot}</p>}
      <div className="sheet-actions">
        {film.inApp && <button className="button button-primary" onClick={() => playMedia(media)}><PlayIcon size={20} />Lire</button>}
        <a className={film.inApp ? 'button' : 'button button-primary'} href={vlcUrl(url, ios)}><OutIcon size={20} />Ouvrir dans VLC</a>
        {!film.inApp && <button className="button" onClick={() => playMedia(media)}>Essayer dans l'application</button>}
        {!ios && <button className="button" onClick={copy}>{copied ? 'Lien copié' : 'Copier le lien'}</button>}
      </div>
      {!film.inApp && <p className="sheet-note">Format .{film.ext} : Safari ne le lit pas, VLC oui.</p>}
    </Sheet>
  )
}

const episodeLabel = (episode: Episode) => episode.title || `Épisode ${episode.number}`

export function SeriesSheet({ series, account }: { series: Series; account: Account }) {
  const [info, setInfo] = useState<SeriesInfo | null>(null)
  const [error, setError] = useState('')
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setInfo(null)
    setError('')
    setSeasonNumber(null)
    fetchSeriesInfo(account, series.id)
      .then((value) => active && setInfo(value))
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : 'Épisodes indisponibles.'))
    return () => {
      active = false
    }
  }, [account, series.id])

  const season = info?.seasons.find((entry) => entry.number === seasonNumber) ?? info?.seasons[0]

  const play = (episode: Episode) =>
    playMedia({
      kind: 'series', id: episode.id, ext: episode.ext, title: series.title, icon: series.icon,
      subtitle: `S${season?.number} · E${episode.number}`,
    })

  return (
    <Sheet label={series.title} art={series.icon} favorite={<FavButton kind="series" id={series.id} label={series.title} />}>
      <div className="sheet-head">
        <Art src={series.icon} title={series.title} shape="poster" />
        <div className="sheet-info">
          <h2>{series.title}</h2>
          <p className="sheet-facts"><Rating value={series.rating} />{[series.year, info?.genre, series.category].filter(Boolean).join(' · ')}</p>
          <p className="sheet-tags">{series.lang && <span className="tag">{series.lang}</span>}</p>
        </div>
      </div>
      {info?.plot && <p className="sheet-plot">{info.plot}</p>}
      {!info && !error && <p className="state"><span className="spinner" aria-hidden="true" />Chargement des épisodes…</p>}
      {error && <p className="state">{error}</p>}
      {info && !info.seasons.length && <p className="state">Aucun épisode disponible.</p>}
      {info && info.seasons.length > 1 && (
        <div className="chips sheet-seasons" role="group" aria-label="Saison">
          {info.seasons.map((entry) => (
            <button key={entry.number} className="chip" aria-pressed={entry.number === season?.number} onClick={() => setSeasonNumber(entry.number)}>
              Saison {entry.number}
            </button>
          ))}
        </div>
      )}
      {season && (
        <ol className="episodes">
          {season.episodes.map((episode) => {
            const body = (
              <>
                <span className="episode-number">{episode.number}</span>
                <span className="row-text">
                  <span className="row-title">{episodeLabel(episode)}</span>
                  {episode.duration && <span className="row-sub">{episode.duration}</span>}
                </span>
                <FormatBadge ext={episode.ext} />
              </>
            )
            return (
              <li key={episode.id}>
                {playsInApp(episode.ext) ? (
                  <button className="episode" onClick={() => play(episode)}>{body}</button>
                ) : (
                  <a className="episode" href={vlcUrl(mediaUrl(account, 'series', episode.id, episode.ext), ios)}>{body}</a>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </Sheet>
  )
}
