import { useMemo, useState } from 'react'
import { LangChips, Picker } from '../components/Filters'
import { ChannelRow, SkeletonRows } from '../components/Rows'
import { VirtualList } from '../components/VirtualList'
import { inLanguage, type Quality } from '../lib/normalize'
import { loadCatalog, useStore, useVisible } from '../lib/store'

const ROW_HEIGHT = 72
const QUALITY_OPTIONS = [
  { value: '', label: 'Toute qualité' },
  { value: 'UHD', label: 'UHD / 4K' },
  { value: 'FHD', label: 'FHD' },
  { value: 'HD', label: 'HD' },
  { value: 'SD', label: 'SD' },
]

export function Live() {
  const channels = useVisible(useStore((state) => state.channels))
  const lang = useStore((state) => state.prefs.lang)
  const favorites = useStore((state) => state.favorites.channels)
  const load = useStore((state) => state.live)
  const error = useStore((state) => state.liveError)
  const [category, setCategory] = useState('')
  const [quality, setQuality] = useState('')
  const [eventsOnly, setEventsOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  // les chaînes sans langue (« France vs Senegal ») restent visibles quelle que soit la langue choisie
  const inLang = useMemo(
    () => (lang ? channels.filter((channel) => inLanguage(channel.lang, lang)) : channels),
    [channels, lang],
  )
  const categories = useMemo(() => [...new Set(inLang.map((channel) => channel.category).filter(Boolean))], [inLang])
  // catégorie d'une autre langue : le filtre retombe sur « toutes »
  const activeCategory = categories.includes(category) ? category : ''

  // les favoris s'affichent quelle que soit la langue choisie
  const list = useMemo(
    () =>
      (favoritesOnly ? channels.filter((channel) => favorites.includes(channel.key)) : inLang).filter(
        (channel) =>
          (favoritesOnly || !activeCategory || channel.category === activeCategory) &&
          (!quality || channel.variants.some((variant) => variant.quality === quality)) &&
          (!eventsOnly || channel.event),
      ),
    [channels, inLang, favorites, favoritesOnly, activeCategory, quality, eventsOnly],
  )

  return (
    <>
      <header className="head">
        <h1>Direct</h1>
        <LangChips />
        <div className="filters">
          <button className="chip" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}>Favoris</button>
          <Picker
            label="Catégorie" value={activeCategory} onChange={setCategory}
            options={[{ value: '', label: 'Toutes les catégories' }, ...categories.map((name) => ({ value: name, label: name }))]}
          />
          <Picker label="Qualité" value={quality} onChange={setQuality} options={QUALITY_OPTIONS} />
          <button className="chip" aria-pressed={eventsOnly} onClick={() => setEventsOnly(!eventsOnly)}>Événements</button>
        </div>
      </header>
      {load === 'loading' && <SkeletonRows />}
      {load === 'error' && (
        <div className="state">
          <p>{error}</p>
          <button className="button" onClick={() => void loadCatalog(true)}>Réessayer</button>
        </div>
      )}
      {load === 'ready' && list.length === 0 && (
        <p className="state">{favoritesOnly ? 'Aucune chaîne favorite. Touche le cœur à droite d\'une chaîne.' : 'Aucune chaîne avec ces filtres.'}</p>
      )}
      {list.length > 0 && (
        <VirtualList count={list.length} rowHeight={ROW_HEIGHT} resetKey={`${lang}|${activeCategory}|${quality}|${eventsOnly}|${favoritesOnly}`}>
          {(index) => <ChannelRow key={list[index].key} channel={list[index]} queue={list} quality={(quality as Quality) || undefined} />}
        </VirtualList>
      )}
    </>
  )
}
