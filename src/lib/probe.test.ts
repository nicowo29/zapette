import { describe, expect, it } from 'vitest'
import { analyze, explain } from './probe'

const text = (value: string) => [...value].map((char) => char.charCodeAt(0))
const size = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]

/** Boîte stsd minimale : en-tête, version, nombre d'entrées, puis une entrée portant le code du codec. */
function stsd(code: string): number[] {
  return [...size(32), ...text('stsd'), 0, 0, 0, 0, ...size(1), ...size(16), ...text(code), 0, 0, 0, 0, 0, 0, 0, 0]
}

function mp4(codes: string[], withIndex = true): Uint8Array {
  const tracks = codes.flatMap(stsd)
  const moov = withIndex ? [...size(8 + tracks.length), ...text('moov'), ...tracks] : []
  return new Uint8Array([...size(16), ...text('ftyp'), ...text('isom'), 0, 0, 0, 0, ...moov, ...size(8), ...text('mdat')])
}

describe('analyze', () => {
  it('lit les codecs d\'un mp4', () => {
    expect(analyze(mp4(['avc1', 'mp4a']))).toEqual({ container: 'mp4', video: ['avc1'], audio: ['mp4a'], indexAtEnd: false })
  })
  it('signale un index en fin de fichier', () => {
    expect(analyze(mp4([], false))).toMatchObject({ container: 'mp4', video: [], indexAtEnd: true })
  })
  it('reconnaît un fichier Matroska', () => {
    const bytes = new Uint8Array(32)
    bytes.set([0x1a, 0x45, 0xdf, 0xa3])
    expect(analyze(bytes).container).toBe('matroska')
  })
  it('reconnaît un flux MPEG-TS', () => {
    const bytes = new Uint8Array(400)
    bytes[0] = 0x47
    bytes[188] = 0x47
    expect(analyze(bytes).container).toBe('mpegts')
  })
})

describe('explain', () => {
  it('nomme l\'étiquette HEVC refusée par Safari', () => {
    expect(explain(analyze(mp4(['hev1', 'mp4a'])), 'oui')[0]).toContain('hev1')
  })
  it('nomme le son DTS', () => {
    expect(explain(analyze(mp4(['avc1', 'dtsc'])), 'oui')).toEqual(['Son DTS : Safari ne le lit pas.'])
  })
  it('nomme le serveur qui ignore les lectures partielles', () => {
    expect(explain(analyze(mp4(['avc1', 'mp4a'])), 'non')[0]).toContain('lectures partielles')
  })
  it('dit quand rien n\'est incompatible', () => {
    expect(explain(analyze(mp4(['avc1', 'mp4a'])), 'oui')[0]).toContain('avc1, mp4a')
  })
  it('explique un mkv', () => {
    const bytes = new Uint8Array(32)
    bytes.set([0x1a, 0x45, 0xdf, 0xa3])
    expect(explain(analyze(bytes), 'inconnu')).toEqual(['Fichier Matroska (mkv) : Safari ne lit pas ce format.'])
  })
})
