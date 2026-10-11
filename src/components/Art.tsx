import { useState, type CSSProperties } from 'react'

interface Props {
  src: string
  title: string
  shape: 'logo' | 'poster'
}

function hue(text: string): number {
  let sum = 0
  for (let i = 0; i < text.length; i++) sum = (sum * 31 + text.charCodeAt(i)) % 360
  return sum
}

function initials(title: string): string {
  const words = title.replace(/[^\p{L}\p{N}+ ]/gu, ' ').split(' ').filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase()
}

/** Logo ou affiche. Beaucoup d'images du fournisseur sont absentes ou cassées : repli teinté par le titre. */
export function Art({ src, title, shape }: Props) {
  const [failedSrc, setFailedSrc] = useState('')
  if (!src || failedSrc === src) {
    return (
      <span className={`art art-${shape} art-fallback`} style={{ '--hue': hue(title) } as CSSProperties} aria-hidden="true">
        {shape === 'logo' ? initials(title) : title}
      </span>
    )
  }
  return (
    <img
      className={`art art-${shape}`} src={src} alt="" loading="lazy" decoding="async"
      referrerPolicy="no-referrer" onError={() => setFailedSrc(src)}
    />
  )
}
