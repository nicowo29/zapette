import { useState, type FormEvent } from 'react'
import { Wordmark } from '../components/Wordmark'
import { connect } from '../lib/store'
import { cleanServer } from '../lib/xtream'

export function Setup() {
  const [server, setServer] = useState('')
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const account = { server: cleanServer(server), user: user.trim(), pass: pass.trim() }
    if (!account.server || !account.user || !account.pass) return setError('Remplis les trois champs.')
    setBusy(true)
    setError('')
    try {
      await connect(account)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible.')
      setBusy(false)
    }
  }

  // Une page en https:// ne peut pas joindre un fournisseur en http:// : le navigateur bloque. Même page, en http://.
  const plainUrl = location.protocol === 'https:' ? `http://${location.host}${location.pathname}` : ''

  return (
    <main className="setup">
      <form className="setup-card" onSubmit={submit}>
        <Wordmark />
        <h1>Ajoute ton compte</h1>
        <p className="lead">Les identifiants Xtream donnés par ton fournisseur. À saisir une seule fois : ils restent enregistrés sur cet appareil.</p>
        <label className="field">
          <span>Serveur</span>
          <input
            value={server} onChange={(event) => setServer(event.target.value)} placeholder="http://exemple.com:8080"
            name="server" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="url"
          />
        </label>
        <label className="field">
          <span>Utilisateur</span>
          <input
            value={user} onChange={(event) => setUser(event.target.value)}
            name="username" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="username"
          />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input type="password" name="password" value={pass} onChange={(event) => setPass(event.target.value)} autoComplete="current-password" />
        </label>
        {plainUrl && (
          <p className="notice">
            Page ouverte en connexion sécurisée (https). Si ton fournisseur est en http://, il sera injoignable d'ici.{' '}
            <a href={plainUrl}>Ouvrir la version http</a>
          </p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-wide" disabled={busy}>
          {busy ? 'Vérification…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
