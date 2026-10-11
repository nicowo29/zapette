import { useMemo, useState } from 'react'
import { LangChips, Picker, SORT_OPTIONS } from '../components/Filters'
import { PosterGrid } from '../components/PosterGrid'
import { FilmCard } from '../components/Rows'
import { inLanguage, sortItems, type Sort } from '../lib/normalize'
import { loadCatalog, setPrefs, useStore, useVisible } from '../lib/store'

const FORMAT_OPTIONS = [
  { value: '', label: 'Tout format' },
  { value: 'app', label: 'Dans l\'app' },
  { value: 'vlc', label: 'VLC' },
]

export function Films() {
  const films = useVisible(useStore((state) => state.films))
  const favorites = useStore((state) => state.favorites.films)
  const lang = useStore((state) => state.prefs.lang)
  const sort = useStore((state) => state.prefs.sort)
  const load = useStore((state) => state.vod)
  const error = useStore((state) => state.vodError)
  const [category, setCategory] = useState('')
  const [format, setFormat] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const inLang = useMemo(() => (lang ? films.filter((film) => inLanguage(film.lang, lang)) : films), [films, lang])
  const categories = useMemo(() => [...new Set(inLang.map((film) => film.category).filter(Boolean))], [inLang])
  const activeCategory = categories.includes(category) ? category : ''

  // les favoris s'affichent quelle que soit la langue choisie
  const list = useMemo(
    () =>
      sortItems(
        (favoritesOnly ? films.filter((film) => favorites.includes(film.id)) : inLang).filter(
          (film) =>
            (favoritesOnly || !activeCategory || film.category === activeCategory) &&
            (!format || (format === 'app') === film.inApp),
        ),
        sort,
      ),
    [films, inLang, favorites, favoritesOnly, activeCategory, format, sort],
  )

  return (
    <>
      <header className="head">
        <h1>Films</h1>
        <LangChips />
        <div className="filters">
          <Picker label="Tri" value={sort} onChange={(value) => setPrefs({ sort: value as Sort })} options={SORT_OPTIONS} />
          <button className="chip" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}>Favoris</button>
          <Picker
            label="Catégorie" value={activeCategory} onChange={setCategory}
            options={[{ value: '', label: 'Toutes les catégories' }, ...categories.map((name) => ({ value: name, label: name }))]}
          />
          <Picker label="Format" value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
        </div>
      </header>
      {load === 'loading' && <p className="state"><span className="spinner" aria-hidden="true" />Chargement des films. Le premier téléchargement peut prendre une minute.</p>}
      {load === 'error' && (
        <div className="state">
          <p>{error}</p>
          <button className="button" onClick={() => void loadCatalog(true)}>Réessayer</button>
        </div>
      )}
      {load === 'ready' && list.length === 0 && (
        <p className="state">{favoritesOnly ? 'Aucun film favori. Ouvre un film et touche le cœur.' : 'Aucun film avec ces filtres.'}</p>
      )}
      {list.length > 0 && (
        <PosterGrid items={list} resetKey={`${lang}|${activeCategory}|${format}|${favoritesOnly}|${sort}`} itemKey={(film) => film.id}>
          {(film) => <FilmCard film={film} />}
        </PosterGrid>
      )}
    </>
  )
}
