import type { ReactNode } from 'react'

function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {children}
    </svg>
  )
}

type Props = { size?: number }

export const HomeIcon = (p: Props) => <Icon {...p}><path d="M4 11l8-7 8 7v8a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19v-8z" /></Icon>
export const BackIcon = (p: Props) => <Icon {...p}><path d="M15 6l-6 6 6 6" /></Icon>
export const ChevronIcon = (p: Props) => <Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>
export const TvIcon = (p: Props) => <Icon {...p}><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M8 21h8M9 3l3 3 3-3" /></Icon>
export const FilmIcon = (p: Props) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 3v18M16 3v18M4 8h4M4 16h4M16 8h4M16 16h4" /></Icon>
export const SearchIcon = (p: Props) => <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Icon>
export const GearIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></Icon>
export const CloseIcon = (p: Props) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
export const UpIcon = (p: Props) => <Icon {...p}><path d="M6 15l6-6 6 6" /></Icon>
export const DownIcon = (p: Props) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>
export const PlayIcon = (p: Props) => <Icon {...p}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></Icon>
export const OutIcon = (p: Props) => <Icon {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></Icon>
export const ClearIcon = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></Icon>

export function HeartIcon({ size = 24, filled = false }: Props & { filled?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
    </svg>
  )
}

export const StarIcon = ({ size = 24 }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z" />
  </svg>
)

export const StackIcon = (p: Props) => <Icon {...p}><path d="M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4" /></Icon>
