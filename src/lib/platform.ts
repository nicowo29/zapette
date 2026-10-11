// HLS natif fiable seulement sur WebKit (iPhone, Safari Mac) ; Chrome l'annonce mais échoue.
export const appleWebKit = typeof window !== 'undefined' && 'WebKitPlaybackTargetAvailabilityEvent' in window

export const ios =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
