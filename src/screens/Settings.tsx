import { useState, type FormEvent } from 'react'
import { Picker } from '../components/Filters'
import { BackIcon } from '../components/Icons'
import type { Quality } from '../lib/normalize'
import { loadCatalog, loadPublic, setPrefs, setTab, signOut, useStore } from '../lib/store'

const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Démarrage le plus rapide' },
  { value: 'UHD', label: 'UHD / 4K' },
  { value: 'FHD', label: 'FHD' },
  { value: 'HD', label: 'HD' },
  { value: 'SD', label: 'SD' },
]

const date = (time: number) => new Date(time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export function Settings() {
  const account = useStore((state) => state.account)
  const info = useStore((state) => state.info)
  const quality = useStore((state) => state.prefs.quality)
  const otherLangs = useStore((state) => state.prefs.otherLangs)
  const channels = useStore((state) => state.channels.length)
  const films = useStore((state) => state.films.length)
  const series = useStore((state) => state.series.length)
  const loadedAt = useStore((state) => state.loadedAt)
  const busy = useStore((state) => state.live === 'loading' || state.vod === 'loading' || state.shows === 'loading')
  const savedKey = useStore((state) => state.prefs.tmdbKey)
  const publicLoad = useStore((state) => state.publicLoad)
  const publicError = useStore((state) => state.publicError)
  const publicCount = useStore((state) => (state.publicLists ? state.publicLists.trending.length + state.publicLists.now.length + state.publicLists.top.length : 0))
  const [key, setKey] = useState(savedKey)
  const [refreshing, setRefreshing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    await loadCatalog(true)
    setRefreshing(false)
  }

  const saveKey = (event: FormEvent) => {
    event.preventDefault()
    setPrefs({ tmdbKey: key.trim() })
    void loadPublic(true)
  }

  return (
    <>
      <header className="head head-back">
        <button className="icon-button" aria-label="Retour à l'accueil" onClick={() => setTab('home')}><BackIcon /></button>
        <h1>Réglages</h1>
      </header>
      <div className="results settings">
        <section>
          <h2>Compte</h2>
          <dl className="facts">
            <div><dt>Serveur</dt><dd>{account?.server.replace(/^https?:\/\//, '')}</dd></div>
            <div><dt>Statut</dt><dd>{info?.status || 'Inconnu'}</dd></div>
            <div><dt>Fin d'abonnement</dt><dd>{info?.expires ? date(info.expires) : 'Inconnue'}</dd></div>
            <div><dt>Écrans simultanés</dt><dd>{info?.maxConnections ?? 'Inconnu'}</dd></div>
          </dl>
        </section>
        <section>
          <h2>Lecture</h2>
          <div className="setting">
            <span>Qualité lancée d'un tap</span>
            <Picker label="Qualité lancée d'un tap" value={quality} onChange={(value) => setPrefs({ quality: value as Quality | 'auto' })} options={QUALITY_OPTIONS} />
          </div>
        </section>
        <section>
          <h2>Langues</h2>
          <div className="setting">
            <span>Français et anglais seulement</span>
            <button className="switch" role="switch" aria-checked={!otherLangs} aria-label="Français et anglais seulement" onClick={() => setPrefs({ otherLangs: !otherLangs })} />
          </div>
          <p className="hint">Activé : chaînes, films et séries des autres langues sont masqués partout. Un contenu sans langue indiquée reste visible.</p>
        </section>
        <section>
          <h2>Notes du public</h2>
          <p className="hint">
            Avec une clé TMDB gratuite, l'accueil affiche les tendances de la semaine et classe les films par note réelle du public.
            Crée un compte sur themoviedb.org, puis Paramètres, API, et copie la clé ici.
          </p>
          <form className="key-form" onSubmit={saveKey}>
            <input
              value={key} onChange={(event) => setKey(event.target.value)} aria-label="Clé TMDB" placeholder="Clé TMDB"
              autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off"
            />
            <button className="button">{savedKey && !key.trim() ? 'Retirer' : 'Enregistrer'}</button>
          </form>
          {publicLoad === 'loading' && <p className="hint">Vérification de la clé…</p>}
          {publicLoad === 'error' && <p className="form-error" role="alert">{publicError}</p>}
          {publicLoad === 'ready' && <p className="hint hint-ok">Notes du public actives : {publicCount} films reçus de TMDB.</p>}
          <p className="hint">Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.</p>
        </section>
        <section>
          <h2>Catalogue</h2>
          <dl className="facts">
            <div><dt>Chaînes</dt><dd>{channels.toLocaleString('fr-FR')}</dd></div>
            <div><dt>Films</dt><dd>{films.toLocaleString('fr-FR')}</dd></div>
            <div><dt>Séries</dt><dd>{series.toLocaleString('fr-FR')}</dd></div>
            <div><dt>Mis à jour</dt><dd>{loadedAt ? date(loadedAt) : 'Jamais'}</dd></div>
          </dl>
          <button className="button button-wide" disabled={refreshing || busy} onClick={refresh}>
            {refreshing || busy ? 'Mise à jour…' : 'Mettre à jour le catalogue'}
          </button>
        </section>
        <section>
          {confirming ? (
            <div className="confirm">
              <p>Le compte, le catalogue et les favoris enregistrés sur cet appareil seront effacés.</p>
              <button className="button button-danger button-wide" onClick={() => void signOut()}>Effacer et se déconnecter</button>
              <button className="button button-wide" onClick={() => setConfirming(false)}>Annuler</button>
            </div>
          ) : (
            <button className="button button-wide" onClick={() => setConfirming(true)}>Se déconnecter</button>
          )}
        </section>
      </div>
    </>
  )
}
