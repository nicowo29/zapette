import { useEffect, useRef, useState, type TouchEvent } from 'react'
import type Hls from 'hls.js'
import { qualitiesOf } from '../lib/normalize'
import { appleWebKit, ios } from '../lib/platform'
import { probe } from '../lib/probe'
import { setVariant, stop, zap, type Now } from '../lib/store'
import { liveUrl, mediaUrl, vlcUrl, type Account } from '../lib/xtream'
import { Art } from './Art'
import { CloseIcon, DownIcon, OutIcon, UpIcon } from './Icons'
import { FavButton } from './Rows'

type Status = 'loading' | 'playing' | 'error'

const LIVE_TIMEOUT = 15000
const FILM_TIMEOUT = 20000
const HLS_FILM_TIMEOUT = 8000
const SWIPE = 50

/** Lecteur ancré en haut de l'écran : la liste reste utilisable dessous pour zapper d'un tap. */
export function Player({ now, account }: { now: Now; account: Account }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [attempt, setAttempt] = useState(0)
  const [hlsFallback, setHlsFallback] = useState(false)
  const [diagnosis, setDiagnosis] = useState<string[] | null>(null)
  const tried = useRef(new Set<number>())
  const touch = useRef<{ x: number; y: number } | null>(null)

  const live = now.kind === 'live'
  const identity = live ? now.channel.key : `${now.media.kind}-${now.media.id}`
  const fileUrl = live ? '' : mediaUrl(account, now.media.kind, now.media.id, now.media.ext)
  // Second essai pour un film : certains fournisseurs le servent aussi en HLS, que Safari lit quel que soit le fichier d'origine.
  const url = live
    ? liveUrl(account, now.variantId)
    : hlsFallback ? mediaUrl(account, now.media.kind, now.media.id, 'm3u8') : fileUrl
  const title = live ? now.channel.title : now.media.title
  const icon = live ? now.channel.icon : now.media.icon

  useEffect(() => {
    tried.current = new Set()
  }, [identity])

  useEffect(() => {
    const video = videoRef.current!
    let active = true
    let hls: Hls | null = null
    setStatus('loading')

    const fail = () => {
      if (!active) return
      clearTimeout(timer)
      // une autre qualité de la même chaîne peut répondre quand celle-ci est muette
      if (now.kind === 'live') {
        tried.current.add(now.variantId)
        const other = now.channel.variants.find((variant) => !tried.current.has(variant.id))
        if (other) return setVariant(other.id)
      } else if (!hlsFallback) {
        return setHlsFallback(true)
      } else {
        void probe(fileUrl).then((lines) => active && setDiagnosis(lines))
      }
      setStatus('error')
    }
    const onPlaying = () => {
      clearTimeout(timer)
      if (active) setStatus('playing')
    }
    const onError = () => {
      if (!hls) fail()
    }
    const timer = setTimeout(fail, live ? LIVE_TIMEOUT : hlsFallback ? HLS_FILM_TIMEOUT : FILM_TIMEOUT)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('error', onError)

    if (url.endsWith('.m3u8') && !appleWebKit) {
      void import('hls.js').then(({ default: HlsLib }) => {
        if (!active) return
        if (!HlsLib.isSupported()) return fail()
        hls = new HlsLib()
        hls.on(HlsLib.Events.ERROR, (_, data) => {
          if (data.fatal) fail()
        })
        hls.loadSource(url)
        hls.attachMedia(video)
        video.play().catch(() => {})
      })
    } else {
      video.src = url
      video.play().catch(() => {})
    }

    return () => {
      active = false
      clearTimeout(timer)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('error', onError)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
    // `now` change à chaque zapping ; l'adresse suffit à identifier le flux
  }, [url, attempt])

  const retry = () => {
    tried.current = new Set()
    setHlsFallback(false)
    setDiagnosis(null)
    setAttempt((count) => count + 1)
  }

  const onTouchStart = (event: TouchEvent) => {
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current
    touch.current = null
    if (!start || !live) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dy) > SWIPE && Math.abs(dy) > Math.abs(dx) * 1.5) zap(dy < 0 ? 1 : -1)
  }

  const qualities = live ? qualitiesOf(now.channel.variants).filter(Boolean) : []
  const currentQuality = live ? now.channel.variants.find((variant) => variant.id === now.variantId)?.quality : ''
  const canZap = live && now.queue.length > 1
  const vlc = vlcUrl(live ? url : fileUrl, ios)
  const sub =
    status === 'loading' ? 'Chargement…'
    : status === 'error' ? 'Lecture impossible'
    : live ? 'En direct' : now.media.subtitle

  return (
    <section className="dock" aria-label="Lecteur">
      <div className="dock-video" data-error={status === 'error' || undefined} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <video ref={videoRef} controls playsInline autoPlay {...{ 'x-webkit-airplay': 'allow' }} />
        {status === 'loading' && <div className="dock-veil"><span className="spinner" aria-label="Chargement" /></div>}
        {status === 'error' && (
          <div className="dock-veil dock-error" role="alert">
            {live ? (
              <p>Cette chaîne ne répond pas. Elle n'émet peut-être pas, ou ton abonnement est déjà utilisé sur un autre écran.</p>
            ) : (
              <>
                <p>Ce film ne se lit pas dans l'application. VLC le lira.</p>
                <ul className="dock-diagnosis">
                  {diagnosis ? diagnosis.map((line) => <li key={line}>{line}</li>) : <li>Recherche de la cause…</li>}
                </ul>
              </>
            )}
            <div className="dock-error-actions">
              <button className="button" onClick={retry}>Réessayer</button>
              <a className="button button-primary" href={vlc}>Ouvrir dans VLC</a>
            </div>
          </div>
        )}
      </div>
      <div className="dock-bar">
        <Art src={icon} title={title} shape="logo" />
        <div className="row-text">
          <span className="row-title">{title}</span>
          <span className="row-sub"><span className="row-sub-text" data-live={(status === 'playing' && live) || undefined}>{sub}</span></span>
        </div>
        {live && <FavButton kind="channels" id={now.channel.key} label={title} />}
        <a className="icon-button" aria-label="Ouvrir dans VLC" href={vlc}><OutIcon /></a>
        <button className="icon-button" aria-label="Fermer le lecteur" onClick={stop}><CloseIcon /></button>
      </div>
      {now.kind === 'live' && (qualities.length > 1 || canZap) && (
        <div className="dock-tools">
          <span className="row-pills">
            {qualities.length > 1 && qualities.map((quality) => (
              <button
                key={quality} className="pill" data-on={quality === currentQuality || undefined}
                aria-label={`Passer en ${quality}`}
                onClick={() => setVariant(now.channel.variants.find((variant) => variant.quality === quality)!.id)}
              >
                {quality}
              </button>
            ))}
          </span>
          {canZap && (
            <span className="dock-zap">
              <button className="button" onClick={() => zap(-1)}><UpIcon size={20} />Précédente</button>
              <button className="button" onClick={() => zap(1)}><DownIcon size={20} />Suivante</button>
            </span>
          )}
        </div>
      )}
    </section>
  )
}
