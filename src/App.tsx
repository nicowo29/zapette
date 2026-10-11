import { useEffect, useRef, type ReactNode, type TouchEvent } from 'react'
import { FilmSheet, SeriesSheet } from './components/FilmSheet'
import { FilmIcon, HomeIcon, SearchIcon, StackIcon, TvIcon } from './components/Icons'
import { Player } from './components/Player'
import { ScreenVisible } from './components/VirtualList'
import { boot, currentTab, setTab, useStore, type Tab } from './lib/store'
import { Films } from './screens/Films'
import { Home } from './screens/Home'
import { Live } from './screens/Live'
import { Search } from './screens/Search'
import { Settings } from './screens/Settings'
import { Setup } from './screens/Setup'
import { Shows } from './screens/Shows'

// Pages côte à côte : on passe de l'une à l'autre en glissant, sur la page ou sur la barre du bas.
const PAGES: { id: Tab; label: string; icon: ReactNode; screen: ReactNode }[] = [
  { id: 'home', label: 'Accueil', icon: <HomeIcon />, screen: <Home /> },
  { id: 'live', label: 'Direct', icon: <TvIcon />, screen: <Live /> },
  { id: 'films', label: 'Films', icon: <FilmIcon />, screen: <Films /> },
  { id: 'shows', label: 'Séries', icon: <StackIcon />, screen: <Shows /> },
  { id: 'search', label: 'Recherche', icon: <SearchIcon />, screen: <Search /> },
]

const SETTLE_DELAY = 120
const DRAG_THRESHOLD = 8

const smooth = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

export function App() {
  const booted = useStore((state) => state.booted)
  const account = useStore((state) => state.account)
  const now = useStore((state) => state.now)
  const detail = useStore((state) => state.detail)
  const tab = useStore((state) => state.tab)
  const pagerRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const drag = useRef<{ x: number; left: number; active: boolean } | null>(null)
  const ready = booted && account !== null

  useEffect(() => {
    void boot()
  }, [])

  // Défilement du carrousel : la pastille de la barre suit le doigt, l'onglet change à l'arrêt.
  useEffect(() => {
    const pager = pagerRef.current
    if (!pager) return
    let timer = 0
    // un événement de défilement par image au plus : pas besoin de le différer davantage
    const follow = () => {
      if (pager.clientWidth) barRef.current?.style.setProperty('--pager', (pager.scrollLeft / pager.clientWidth).toFixed(3))
    }
    const settle = () => {
      clearTimeout(timer)
      if (drag.current?.active || !pager.clientWidth) return
      const page = PAGES[Math.round(pager.scrollLeft / pager.clientWidth)]
      if (page && currentTab() !== 'settings' && currentTab() !== page.id) setTab(page.id)
    }
    const onScroll = () => {
      follow()
      clearTimeout(timer)
      timer = window.setTimeout(settle, SETTLE_DELAY)
    }
    pager.addEventListener('scroll', onScroll, { passive: true })
    pager.addEventListener('scrollend', settle)
    window.addEventListener('resize', follow)
    return () => {
      clearTimeout(timer)
      pager.removeEventListener('scroll', onScroll)
      pager.removeEventListener('scrollend', settle)
      window.removeEventListener('resize', follow)
    }
  }, [ready])

  // Onglet choisi (tap, « Tout voir ») : le carrousel rejoint la page.
  useEffect(() => {
    const pager = pagerRef.current
    const index = PAGES.findIndex((page) => page.id === tab)
    if (!pager || index < 0) return
    const target = index * pager.clientWidth
    if (Math.abs(pager.scrollLeft - target) > 2) pager.scrollTo({ left: target, behavior: smooth() })
    // clavier ouvert sur la recherche : il se ferme quand on quitte la page
    const focused = document.activeElement
    if (focused instanceof HTMLElement && pager.contains(focused) && !pager.children[index]?.contains(focused)) focused.blur()
  }, [tab, ready])

  if (!booted) return null
  if (!account) return <Setup />

  // Glisser le doigt sur la barre fait défiler les pages : un onglet de large = une page.
  const onBarTouchStart = (event: TouchEvent) => {
    const pager = pagerRef.current
    if (pager) drag.current = { x: event.touches[0].clientX, left: pager.scrollLeft, active: false }
  }
  const onBarTouchMove = (event: TouchEvent) => {
    const pager = pagerRef.current
    const state = drag.current
    if (!pager || !state) return
    const dx = event.touches[0].clientX - state.x
    if (!state.active && Math.abs(dx) < DRAG_THRESHOLD) return
    state.active = true
    pager.style.scrollSnapType = 'none'
    pager.scrollLeft = state.left + dx * PAGES.length
  }
  const onBarTouchEnd = (event: TouchEvent) => {
    const pager = pagerRef.current
    const state = drag.current
    drag.current = null
    if (!pager || !state?.active) return
    // le geste était un glissement : pas de tap sur l'onglet survolé
    event.preventDefault()
    pager.style.scrollSnapType = ''
    const page = PAGES[Math.max(0, Math.min(PAGES.length - 1, Math.round(pager.scrollLeft / pager.clientWidth)))]
    pager.scrollTo({ left: PAGES.indexOf(page) * pager.clientWidth, behavior: smooth() })
    setTab(page.id)
  }

  return (
    <div className="app" data-playing={now ? '' : undefined}>
      {/* même lecteur d'une chaîne à l'autre (zapping sans coupure) ; lecteur neuf pour chaque film */}
      {now && <Player key={now.kind === 'live' ? 'live' : `${now.media.kind}-${now.media.id}`} now={now} account={account} />}
      <main className="screens">
        <div className="pager" ref={pagerRef}>
          {PAGES.map((page) => (
            <section key={page.id} className="screen" aria-label={page.label} inert={tab !== page.id}>
              <ScreenVisible.Provider value={tab === page.id}>{page.screen}</ScreenVisible.Provider>
            </section>
          ))}
        </div>
        {tab === 'settings' && <section className="screen screen-over" aria-label="Réglages"><Settings /></section>}
      </main>
      <nav
        className="tabbar" aria-label="Navigation" ref={barRef}
        onTouchStart={onBarTouchStart} onTouchMove={onBarTouchMove} onTouchEnd={onBarTouchEnd} onTouchCancel={onBarTouchEnd}
      >
        <span className="tab-glider" data-off={tab === 'settings' || undefined} aria-hidden="true" />
        {PAGES.map((page) => (
          <button key={page.id} className="tab" aria-current={page.id === tab ? 'page' : undefined} onClick={() => setTab(page.id)}>
            <span className="tab-icon">{page.icon}</span>
            <span>{page.label}</span>
          </button>
        ))}
      </nav>
      {detail?.type === 'film' && <FilmSheet film={detail.film} account={account} />}
      {detail?.type === 'series' && <SeriesSheet series={detail.series} account={account} />}
    </div>
  )
}
