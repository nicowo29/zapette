import type { LangFilter } from '../lib/normalize'
import { setPrefs, useStore } from '../lib/store'

const LANGUAGES: { value: LangFilter; label: string }[] = [
  { value: '', label: 'Tout' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
]

/** Langue choisie une fois, appliquée à tous les écrans. */
export function LangChips() {
  const current = useStore((state) => state.prefs.lang)
  return (
    <div className="chips" role="group" aria-label="Langue">
      {LANGUAGES.map((language) => (
        <button
          key={language.value} className="chip" aria-pressed={current === language.value}
          onClick={() => setPrefs({ lang: language.value })}
        >
          {language.label}
        </button>
      ))}
    </div>
  )
}

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Ajouts récents' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'year', label: 'Année de sortie' },
  { value: 'title', label: 'De A à Z' },
]

interface PickerProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

/** Liste native : sur iPhone elle ouvre la roue de sélection, plus rapide qu'une rangée de 60 pastilles. */
export function Picker({ label, value, options, onChange }: PickerProps) {
  return (
    <label className="picker" data-active={value !== options[0]?.value}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
