import { useMemo, useState } from 'react'
import { LangChips, Picker, SORT_OPTIONS } from '../components/Filters'
import { PosterGrid } from '../components/PosterGrid'
import { SeriesCard } from '../components/Rows'
import { inLanguage, sortItems, type Sort } from '../lib/normalize'
import { loadCatalog, setPrefs, useStore, useVisible } from '../lib/store'

export function Shows() {
  const series = useVisible(useStore((state) => state.series))
  const favorites = useStore((state) => state.favorites.series)
  const lang = useStore((state) => state.prefs.lang)
  const sort = useStore((state) => state.prefs.sort)
  const load = useStore((state) => state.shows)
  const error = useStore((state) => state.showsError)
  const [category, setCategory] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const inLang = useMemo(() => (lang ? series.filter((entry) => inLanguage(entry.lang, lang)) : series), [series, lang])
  const categories = useMemo(() => [...new Set(inLang.map((entry) => entry.category).filter(Boolean))], [inLang])
  const activeCategory = categories.includes(category) ? category : ''

  // les favoris s'affichent quelle que soit la langue choisie
  const list = useMemo(
    () =>
      sortItems(
        (favoritesOnly ? series.filter((entry) => favorites.includes(entry.id)) : inLang).filter(
          (entry) => favoritesOnly || !activeCategory || entry.category === activeCategory,
        ),
        sort,
      ),
    [series, inLang, favorites, favoritesOnly, activeCategory, sort],
  )

  return (
    <>
      <header className="head">
        <h1>Séries</h1>
        <LangChips />
        <div className="filters">
          <Picker label="Tri" value={sort} onChange={(value) => setPrefs({ sort: value as Sort })} options={SORT_OPTIONS} />
          <button className="chip" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}>Favoris</button>
          <Picker
            label="Catégorie" value={activeCategory} onChange={setCategory}
            options={[{ value: '', label: 'Toutes les catégories' }, ...categories.map((name) => ({ value: name, label: name }))]}
          />
        </div>
      </header>
      {load === 'loading' && <p className="state"><span className="spinner" aria-hidden="true" />Chargement des séries…</p>}
      {load === 'idle' && <p className="state"><span className="spinner" aria-hidden="true" />Les séries arrivent après les films.</p>}
      {load === 'error' && (
        <div className="state">
          <p>{error}</p>
          <button className="button" onClick={() => void loadCatalog(true)}>Réessayer</button>
        </div>
      )}
      {load === 'ready' && list.length === 0 && (
        <p className="state">{favoritesOnly ? 'Aucune série favorite. Ouvre une série et touche le cœur.' : 'Aucune série avec ces filtres.'}</p>
      )}
      {list.length > 0 && (
        <PosterGrid items={list} resetKey={`${lang}|${activeCategory}|${favoritesOnly}|${sort}`} itemKey={(entry) => entry.id}>
          {(entry) => <SeriesCard series={entry} />}
        </PosterGrid>
      )}
    </>
  )
}
