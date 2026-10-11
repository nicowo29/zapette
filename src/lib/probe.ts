// Analyse d'un film qui refuse de se lire : conteneur, codecs, lectures partielles.
// Safari ne dit que « code 4 ». L'en-tête du fichier dit pourquoi.

export interface Analysis {
  container: 'mp4' | 'matroska' | 'mpegts' | 'avi' | 'flv' | 'inconnu'
  video: string[]
  audio: string[]
  /** index (moov) introuvable au début : il est en fin de fichier */
  indexAtEnd: boolean
}

export type RangeSupport = 'oui' | 'non' | 'inconnu'

const VIDEO_CODES = ['avc1', 'avc3', 'hvc1', 'hev1', 'dvh1', 'dvhe', 'av01', 'vp09', 'mp4v']
const AUDIO_CODES = ['mp4a', 'ac-3', 'ec-3', 'dtsc', 'dtsh', 'dtsl', 'dtse', 'Opus', 'fLaC', '.mp3']

const ascii = (bytes: Uint8Array, at: number, length = 4) => String.fromCharCode(...bytes.subarray(at, at + length))
const uint32 = (bytes: Uint8Array, at: number) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0

function containerOf(bytes: Uint8Array): Analysis['container'] {
  if (bytes.length < 12) return 'inconnu'
  if (ascii(bytes, 4) === 'ftyp') return 'mp4'
  if (uint32(bytes, 0) === 0x1a45dfa3) return 'matroska'
  if (ascii(bytes, 0) === 'RIFF') return 'avi'
  if (ascii(bytes, 0, 3) === 'FLV') return 'flv'
  if (bytes[0] === 0x47 && bytes[188] === 0x47) return 'mpegts'
  return 'inconnu'
}

/** Codecs déclarés dans les boîtes `stsd` : le code à quatre lettres suit l'en-tête de la boîte. */
export function analyze(bytes: Uint8Array): Analysis {
  const container = containerOf(bytes)
  const analysis: Analysis = { container, video: [], audio: [], indexAtEnd: false }
  if (container !== 'mp4') return analysis

  let moovSeen = false
  for (let at = 0; at + 20 <= bytes.length; at++) {
    if (bytes[at] === 0x6d && ascii(bytes, at) === 'moov') moovSeen = true
    if (bytes[at] !== 0x73 || ascii(bytes, at) !== 'stsd') continue
    const code = ascii(bytes, at + 16)
    if (VIDEO_CODES.includes(code) && !analysis.video.includes(code)) analysis.video.push(code)
    if (AUDIO_CODES.includes(code) && !analysis.audio.includes(code)) analysis.audio.push(code)
  }
  analysis.indexAtEnd = !moovSeen
  return analysis
}

const VIDEO_VERDICTS: Record<string, string> = {
  hev1: 'Vidéo HEVC étiquetée « hev1 » : Safari exige l\'étiquette « hvc1 ». C\'est la cause de l\'échec.',
  dvhe: 'Vidéo Dolby Vision étiquetée « dvhe » : Safari exige « dvh1 ». C\'est la cause de l\'échec.',
  mp4v: 'Vidéo MPEG-4 ancienne (Xvid, DivX) : Safari ne la lit pas.',
  vp09: 'Vidéo VP9 : Safari ne la lit pas dans ce format.',
  av01: 'Vidéo AV1 : lue seulement par les iPhone les plus récents.',
}

const CONTAINER_VERDICTS: Record<string, string> = {
  matroska: 'Fichier Matroska (mkv) : Safari ne lit pas ce format.',
  mpegts: 'Fichier MPEG-TS : Safari ne lit pas ce format hors direct.',
  avi: 'Fichier AVI : Safari ne lit pas ce format.',
  flv: 'Fichier FLV : Safari ne lit pas ce format.',
  inconnu: 'Format de fichier non reconnu.',
}

/** Phrases lisibles par l'utilisateur, cause la plus probable en premier. */
export function explain(analysis: Analysis, range: RangeSupport): string[] {
  if (analysis.container !== 'mp4') return [CONTAINER_VERDICTS[analysis.container]]
  const lines: string[] = []
  for (const code of analysis.video) if (VIDEO_VERDICTS[code]) lines.push(VIDEO_VERDICTS[code])
  if (analysis.audio.some((code) => code.startsWith('dts'))) lines.push('Son DTS : Safari ne le lit pas.')
  if (range === 'non') lines.push('Le serveur ignore les lectures partielles : Safari les exige pour un film.')
  if (analysis.indexAtEnd) {
    lines.push('Index du film placé en fin de fichier : codecs non vérifiables d\'ici, démarrage plus lent.')
  }
  if (!lines.length) {
    const codecs = [...analysis.video, ...analysis.audio].join(', ') || 'non déterminés'
    lines.push(`Rien d'incompatible dans l'en-tête (codecs : ${codecs}). Cause possible : vidéo 10 bits, ou abonnement utilisé sur un autre écran.`)
  }
  return lines
}

const HEAD_LIMIT = 8 * 1024 * 1024
const TIMEOUT = 12000

async function readHead(url: string, signal: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(url, { signal })
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < HEAD_LIMIT) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
    // vidéo et son trouvés : inutile de télécharger davantage
    if (total > 256 * 1024 && total % (1024 * 1024) < value.length) {
      const found = analyze(concat(chunks, total))
      if (found.container !== 'mp4' || (found.video.length && found.audio.length)) break
    }
  }
  void reader.cancel().catch(() => {})
  return concat(chunks, total)
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const bytes = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.length
  }
  return bytes
}

async function rangeSupport(url: string, signal: AbortSignal): Promise<RangeSupport> {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-1' }, signal })
    void response.body?.cancel().catch(() => {})
    return response.status === 206 ? 'oui' : 'non'
  } catch {
    // demande refusée avant d'atteindre le serveur (contrôle du navigateur) : pas de verdict
    return 'inconnu'
  }
}

export async function probe(url: string): Promise<string[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const head = await readHead(url, controller.signal)
    const range = await rangeSupport(url, controller.signal)
    return explain(analyze(head), range)
  } catch {
    return ['Analyse impossible : le fournisseur ne laisse pas l\'application lire ce fichier directement.']
  } finally {
    clearTimeout(timer)
  }
}
