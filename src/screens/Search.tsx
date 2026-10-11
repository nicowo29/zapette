import { useDeferredValue, useMemo, useState } from 'react'
import { LangChips } from '../components/Filters'
import { ClearIcon, SearchIcon } from '../components/Icons'
import { ChannelRow, FilmRow, SeriesRow } from '../components/Rows'
import { fold, inLanguage, type Channel, type Film, type LangFilter, type Series } from '../lib/normalize'
import { setPrefs, useStore, useVisible } from '../lib/store'

const MAX_PER_SECTION = 30

interface Results {
  events: Channel[]
  channels: Channel[]
  films: Film[]
  series: Series[]
}

/** Tous les mots tapés doivent figurer dans la clé de recherche, dans n'importe quel ordre. */
function search(query: string, lang: LangFilter, channels: Channel[], films: Film[], series: Series[]): Results {
  const words = fold(query).split(' ').filter(Boolean)
  const matches = (item: { search: string; lang: string }) =>
    inLanguage(item.lang, lang) && words.every((word) => item.search.includes(word))
  const results: Results = { events: [], channels: [], films: [], series: [] }
  for (const channel of channels) {
    if (!matches(channel)) continue
    const bucket = channel.event ? results.events : results.channels
    if (bucket.length < MAX_PER_SECTION) bucket.push(channel)
  }
  if (words.length) {
    for (const film of films) {
      if (!matches(film)) continue
      results.films.push(film)
      if (results.films.length === MAX_PER_SECTION) break
    }
    for (const entry of series) {
      if (!matches(entry)) continue
      results.series.push(entry)
      if (results.series.length === MAX_PER_SECTION) break
    }
  }
  return results
}

export function Search() {
  const channels = useVisible(useStore((state) => state.channels))
  const films = useVisible(useStore((state) => state.films))
  const series = useVisible(useStore((state) => state.series))
  const lang = useStore((state) => state.prefs.lang)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)

  const results = useMemo(() => search(deferred, lang, channels, films, series), [deferred, lang, channels, films, series])
  const typed = deferred.trim() !== ''
  // sans recherche : les événements en cours servent d'accueil
  const events = typed ? results.events : results.events.filter((channel) => !channel.event?.ended)
  const empty = typed && !events.length && !results.channels.length && !results.films.length && !results.series.length

  return (
    <>
      <header className="head">
        <h1>Recherche</h1>
        <div className="searchbox">
          <SearchIcon size={20} />
          <input
            type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Recherche"
            placeholder="Chaîne, film, série, équipe" enterKeyHint="search"
            autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off"
          />
          {query && <button className="searchbox-clear" aria-label="Effacer" onClick={() => setQuery('')}><ClearIcon size={20} /></button>}
        </div>
        <LangChips />
      </header>
      <div className="results">
        {empty && (
          <div className="state">
            <p>Aucun résultat pour « {deferred.trim()} »{lang === 'fr' ? ' en français' : lang === 'en' ? ' en anglais' : ''}.</p>
            {lang && <button className="button" onClick={() => setPrefs({ lang: '' })}>Chercher en français et en anglais</button>}
          </div>
        )}
        {events.length > 0 && (
          <section>
            <h2>{typed ? 'Événements' : 'Événements en cours'}</h2>
            {events.map((channel) => <ChannelRow key={channel.key} channel={channel} queue={events} />)}
          </section>
        )}
        {typed && results.channels.length > 0 && (
          <section>
            <h2>Chaînes</h2>
            {results.channels.map((channel) => <ChannelRow key={channel.key} channel={channel} queue={results.channels} />)}
          </section>
        )}
        {results.films.length > 0 && (
          <section>
            <h2>Films</h2>
            {results.films.map((film) => <FilmRow key={film.id} film={film} />)}
          </section>
        )}
        {results.series.length > 0 && (
          <section>
            <h2>Séries</h2>
            {results.series.map((entry) => <SeriesRow key={entry.id} series={entry} />)}
          </section>
        )}
        {!typed && !events.length && <p className="state">Tape le nom d'une chaîne, d'un film, d'une série, d'une équipe ou d'une compétition.</p>}
      </div>
    </>
  )
}
