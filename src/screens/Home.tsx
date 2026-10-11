import { useMemo, type ReactNode } from 'react'
import { Art } from '../components/Art'
import { ChevronIcon, GearIcon, HeartIcon } from '../components/Icons'
import { Bars, FilmCard, Rating, SeriesCard, usePlaying } from '../components/Rows'
import { Wordmark } from '../components/Wordmark'
import { inLanguage, sortItems, type Channel, type Film } from '../lib/normalize'
import { dayNumber, dedupe, essentials, nowShowing, providerShelves, seriesOfTheMoment } from '../lib/picks'
import { byPublicRating, matchCatalog, titleIndex } from '../lib/tmdb'
import { openDetail, playChannel, setTab, useStore, useVisible, type Tab } from '../lib/store'

const RAIL_SIZE = 18

interface RailProps {
  title: string
  /** écran où se trouve la liste complète */
  more?: Tab
  children: ReactNode
}

function Rail({ title, more, children }: RailProps) {
  return (
    <section className="rail">
      <div className="rail-head">
        <h2>{title}</h2>
        {more && <button className="rail-more" onClick={() => setTab(more)}>Tout voir<ChevronIcon size={16} /></button>}
      </div>
      <div className="rail-track">{children}</div>
    </section>
  )
}

function ChannelTile({ channel, queue }: { channel: Channel; queue: Channel[] }) {
  const playing = usePlaying(channel)
  return (
    <button className="tile" data-playing={playing || undefined} onClick={() => playChannel(channel, queue)}>
      <Art src={channel.icon} title={channel.title} shape="logo" />
      <span className="tile-name">{playing && <Bars />}{channel.title}</span>
    </button>
  )
}

function EventCard({ channel, queue }: { channel: Channel; queue: Channel[] }) {
  const playing = usePlaying(channel)
  return (
    <button className="event" data-playing={playing || undefined} onClick={() => playChannel(channel, queue)}>
      <span className="event-title">{channel.title}</span>
      <span className="event-sub">
        {playing ? <Bars /> : <span className="live-dot" aria-hidden="true" />}
        {[channel.event?.detail || 'En direct', channel.lang].filter(Boolean).join(' · ')}
      </span>
    </button>
  )
}

function Hero({ film, rating }: { film: Film; rating?: number }) {
  return (
    <button className="hero" onClick={() => openDetail({ type: 'film', film })}>
      {/* ambiance tirée de l'affiche elle-même : la couleur de l'écran suit le film mis en avant */}
      <span className="ambient" style={{ backgroundImage: `url("${film.icon}")` }} aria-hidden="true" />
      <Art src={film.icon} title={film.title} shape="poster" />
      <span className="hero-text">
        <span className="hero-title">{film.title}</span>
        <span className="hero-facts"><Rating value={rating ?? film.rating} />{[film.year, film.quality, film.category].filter(Boolean).join(' · ')}</span>
        <span className="button button-primary hero-action">Voir la fiche</span>
      </span>
    </button>
  )
}

function SkeletonRail() {
  return (
    <section className="rail" aria-hidden="true">
      <div className="rail-head"><span className="skeleton skeleton-line" style={{ width: 140, height: 18 }} /></div>
      <div className="rail-track">
        {Array.from({ length: 5 }, (_, index) => <span key={index} className="skeleton skeleton-poster rail-cell" />)}
      </div>
    </section>
  )
}

export function Home() {
  const channels = useVisible(useStore((state) => state.channels))
  const films = useVisible(useStore((state) => state.films))
  const series = useVisible(useStore((state) => state.series))
  const favorites = useStore((state) => state.favorites)
  const lang = useStore((state) => state.prefs.lang)
  const live = useStore((state) => state.live)
  const vod = useStore((state) => state.vod)
  const publicLists = useStore((state) => state.publicLists)

  const filmsInLang = useMemo(() => (lang ? films.filter((film) => inLanguage(film.lang, lang)) : films), [films, lang])
  const seriesInLang = useMemo(() => (lang ? series.filter((entry) => inLanguage(entry.lang, lang)) : series), [series, lang])
  const year = new Date().getFullYear()
  const current = useMemo(() => sortItems(nowShowing(filmsInLang, year, RAIL_SIZE * 2), 'rating').slice(0, RAIL_SIZE), [filmsInLang, year])
  // un film déjà à l'affiche ne revient pas dans les rangées suivantes
  const shown = useMemo(() => new Set(current.map((film) => film.id)), [current])
  const shelves = useMemo(
    () =>
      providerShelves(filmsInLang.filter((film) => !shown.has(film.id)), 2, RAIL_SIZE).filter((shelf) => shelf.films.length >= 4),
    [filmsInLang, shown],
  )
  const classics = useMemo(() => essentials(filmsInLang, year, dayNumber(), RAIL_SIZE), [filmsInLang, year])
  const trendingSeries = useMemo(() => seriesOfTheMoment(seriesInLang, RAIL_SIZE), [seriesInLang])
  const recentFilms = useMemo(
    () => dedupe(sortItems(filmsInLang, 'recent').slice(0, RAIL_SIZE * 4).filter((film) => !shown.has(film.id))).slice(0, RAIL_SIZE),
    [filmsInLang, shown],
  )
  const favoriteChannels = useMemo(
    () => channels.filter((channel) => favorites.channels.includes(channel.key)),
    [channels, favorites.channels],
  )
  const events = useMemo(
    () =>
      channels
        .filter((channel) => channel.event && !channel.event.ended && inLanguage(channel.lang, lang))
        .slice(0, RAIL_SIZE),
    [channels, lang],
  )
  const favoriteFilms = useMemo(() => films.filter((film) => favorites.films.includes(film.id)), [films, favorites.films])
  const favoriteSeries = useMemo(() => series.filter((entry) => favorites.series.includes(entry.id)), [series, favorites.series])
  // Avec une clé TMDB : tendances et notes réelles du public, retrouvées dans le catalogue.
  const publicPicks = useMemo(() => {
    if (!publicLists) return null
    const index = titleIndex(filmsInLang)
    return {
      trending: matchCatalog(publicLists.trending, index).slice(0, RAIL_SIZE),
      now: matchCatalog(publicLists.now, index).sort(byPublicRating).slice(0, RAIL_SIZE),
      top: matchCatalog(publicLists.top, index).sort(byPublicRating).slice(0, RAIL_SIZE),
    }
  }, [publicLists, filmsInLang])
  const publicNow = publicPicks && publicPicks.now.length >= 4 ? publicPicks.now : null
  const publicTop = publicPicks && publicPicks.top.length >= 4 ? publicPicks.top : null

  // film à la une : il change chaque jour, parmi les tendances ou les sorties du moment qui ont une affiche
  const candidates = [
    ...(publicPicks?.trending ?? []).map((pick) => ({ film: pick.film, rating: pick.rating as number | undefined })),
    ...(current.length ? current : recentFilms).map((film) => ({ film, rating: undefined as number | undefined })),
  ].filter((entry) => entry.film.icon)
  const hero = candidates.length ? candidates[dayNumber() % Math.min(candidates.length, 7)] : undefined

  return (
    <>
      <header className="head head-home">
        <div className="head-top">
          <Wordmark />
          <button className="icon-button" aria-label="Réglages" onClick={() => setTab('settings')}><GearIcon /></button>
        </div>
      </header>
      <div className="results home">
        {hero && <Hero film={hero.film} rating={hero.rating} />}
        {live === 'loading' && !channels.length && <SkeletonRail />}

        {live !== 'loading' && (
          <Rail title="Chaînes favorites" more="live">
            {favoriteChannels.map((channel) => <ChannelTile key={channel.key} channel={channel} queue={favoriteChannels} />)}
            <button className="tile tile-add" onClick={() => setTab('live')}>
              <span className="tile-add-icon"><HeartIcon size={24} /></span>
              <span className="tile-name">{favoriteChannels.length ? 'Ajouter' : 'Ajoute tes chaînes'}</span>
            </button>
          </Rail>
        )}

        {events.length > 0 && (
          <Rail title="Événements en cours" more="search">
            {events.map((channel) => <EventCard key={channel.key} channel={channel} queue={events} />)}
          </Rail>
        )}

        {vod === 'loading' && !films.length && <SkeletonRail />}
        {publicPicks && publicPicks.trending.length > 0 && (
          <Rail title="Tendances de la semaine" more="films">
            {publicPicks.trending.map((pick) => <div key={pick.film.id} className="rail-cell"><FilmCard film={pick.film} showRating rating={pick.rating} /></div>)}
          </Rail>
        )}
        {publicNow && (
          <Rail title="À l'affiche" more="films">
            {publicNow.map((pick) => <div key={pick.film.id} className="rail-cell"><FilmCard film={pick.film} showRating rating={pick.rating} /></div>)}
          </Rail>
        )}
        {!publicNow && current.length > 0 && (
          <Rail title="À l'affiche" more="films">
            {current.map((film) => <div key={film.id} className="rail-cell"><FilmCard film={film} showRating /></div>)}
          </Rail>
        )}
        {shelves.map((shelf) => (
          <Rail key={shelf.title} title={shelf.title} more="films">
            {shelf.films.map((film) => <div key={film.id} className="rail-cell"><FilmCard film={film} showRating /></div>)}
          </Rail>
        ))}
        {trendingSeries.length > 0 && (
          <Rail title="Séries du moment" more="shows">
            {trendingSeries.map((entry) => <div key={entry.id} className="rail-cell"><SeriesCard series={entry} showRating /></div>)}
          </Rail>
        )}
        {publicTop && (
          <Rail title="Les mieux notés par le public" more="films">
            {publicTop.map((pick) => <div key={pick.film.id} className="rail-cell"><FilmCard film={pick.film} showRating rating={pick.rating} /></div>)}
          </Rail>
        )}
        {!publicTop && classics.length > 0 && (
          <Rail title="Incontournables" more="films">
            {classics.map((film) => <div key={film.id} className="rail-cell"><FilmCard film={film} showRating /></div>)}
          </Rail>
        )}
        {recentFilms.length > 0 && (
          <Rail title="Derniers ajouts" more="films">
            {recentFilms.map((film) => <div key={film.id} className="rail-cell"><FilmCard film={film} /></div>)}
          </Rail>
        )}
        {favoriteFilms.length > 0 && (
          <Rail title="Films favoris" more="films">
            {favoriteFilms.map((film) => <div key={film.id} className="rail-cell"><FilmCard film={film} /></div>)}
          </Rail>
        )}
        {favoriteSeries.length > 0 && (
          <Rail title="Séries favorites" more="shows">
            {favoriteSeries.map((entry) => <div key={entry.id} className="rail-cell"><SeriesCard series={entry} /></div>)}
          </Rail>
        )}
      </div>
    </>
  )
}
