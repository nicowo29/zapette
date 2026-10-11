// Faux fournisseur Xtream pour développer sans compte réel.
// Serveur : http://localhost:8799, utilisateur : demo, mot de passe : demo.
import http from 'node:http'

const PORT = 8799
const HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
const MP4 = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

const LANGS = ['FR', 'ES', 'UK', 'DE', 'IT', 'AR', 'US', 'PT']
const THEMES = ['GÉNÉRALISTES', 'SPORT', 'CINÉMA', 'JEUNESSE', 'INFOS']
const FRENCH = {
  GÉNÉRALISTES: ['TF1', 'France 2', 'France 3', 'Canal+', 'France 5', 'M6', 'Arte', 'C8', 'W9', 'TMC', 'TFX', 'RTL9'],
  SPORT: ['beIN Sports 1', 'beIN Sports 2', 'Eurosport 1', 'RMC Sport 1', 'L\'Équipe', 'Ligue 1+ 1', 'Ligue 1+ 6', 'Canal+ Sport'],
  CINÉMA: ['Canal+ Cinéma', 'OCS Max', 'Ciné+ Premier', 'Paramount Channel', 'TCM Cinéma'],
  JEUNESSE: ['Gulli', 'Disney Channel', 'Cartoon Network', 'Nickelodeon', 'Piwi+'],
  INFOS: ['BFM TV', 'CNews', 'LCI', 'France Info', 'Euronews'],
}
// Écritures réellement utilisées par les fournisseurs : exposants et petites capitales.
const QUALITY_STYLES = [['ᵁᴴᴰ', 'FHD', 'HD'], ['FHD', 'ʜᴅ'], ['HD'], ['ᵁᴴᴰ', 'ʜᴅ', 'SD']]
const EVENTS = [
  'France vs Senegal', 'France vs Iraq', 'FR| PSG vs OM ʜᴅ', 'UK| Arsenal vs Chelsea HD',
  'ES| Real Madrid vs. Barcelona ᵁᴴᴰ', 'End | FocuSport FC vs. Rahimo FC | Ligue 1 - Burkina Faso | IT',
  'Live | Lakers vs. Celtics | NBA | US', 'FR| Toulouse vs La Rochelle | Top 14',
]

const liveCategories = []
const liveStreams = []
let nextId = 1
let categoryId = 1

for (const lang of LANGS) {
  for (const theme of THEMES) {
    const id = String(categoryId++)
    liveCategories.push({ category_id: id, category_name: `|${lang}| ${theme}` })
    const names = lang === 'FR' ? FRENCH[theme] : Array.from({ length: 24 }, (_, i) => `${theme[0]}${theme.slice(1).toLowerCase()} ${lang} ${i + 1}`)
    names.forEach((name, index) => {
      const qualities = QUALITY_STYLES[index % QUALITY_STYLES.length]
      for (const quality of qualities) {
        const streamId = nextId++
        const prefix = index % 2 ? `${lang}|` : `|${lang}|`
        liveStreams.push({
          stream_id: streamId,
          name: `${prefix} ${name} ${quality}`,
          category_id: id,
          // une image sur cinq manquante ou cassée, pour exercer le repli
          stream_icon: streamId % 5 === 0 ? '' : streamId % 7 === 0 ? 'http://localhost:1/casse.png' : `__ORIGIN__/img/logo/${encodeURIComponent(name)}.svg`,
        })
      }
    })
  }
}
const eventCategory = String(categoryId++)
liveCategories.push({ category_id: eventCategory, category_name: 'LIVE EVENTS' })
for (const name of EVENTS) liveStreams.push({ stream_id: nextId++, name, category_id: eventCategory, stream_icon: '' })

const GENRES = ['ACTION', 'COMÉDIE', 'DRAME', 'ANIMATION', 'THRILLER']
const vodCategories = []
const vodStreams = []
const KNOWN = [
  ['FR - Intouchables (2011)', 'mp4'], ['FR - Le Labyrinthe (2014) MULTI', 'mkv'],
  ['FR - Spider-Man : Brand New Day (2026)', 'mp4'], ['FR - The Odyssey - 2026 HDTS', 'ts'],
]
const WORDS = ['Nuit', 'Dernier', 'Retour', 'Secret', 'Empire', 'Voyage', 'Ombre', 'Rivage', 'Frontière', 'Été', 'Silence', 'Éclipse']
let vodCategoryId = 100
for (const lang of ['FR', 'ES', 'UK']) {
  for (const genre of GENRES) {
    const id = String(vodCategoryId++)
    vodCategories.push({ category_id: id, category_name: `${lang} - ${genre}` })
    for (let i = 0; i < 500; i++) {
      const streamId = nextId++
      const known = lang === 'FR' && genre === 'ACTION' ? KNOWN[i] : undefined
      const roll = streamId % 100
      const ext = known ? known[1] : roll < 58 ? 'mkv' : roll < 91 ? 'mp4' : 'ts'
      const title = `${WORDS[i % WORDS.length]} ${WORDS[(i * 7 + 3) % WORDS.length].toLowerCase()} ${i + 1}`
      vodStreams.push({
        stream_id: streamId,
        name: known ? known[0] : `${lang} - ${title} (${1990 + (streamId % 36)})${streamId % 4 === 0 ? ' MULTI' : ''}`,
        category_id: id,
        container_extension: ext,
        rating: (5 + (streamId % 45) / 10).toFixed(1),
        added: String(1790000000 - streamId * 3600),
        stream_icon: streamId % 6 === 0 ? '' : `__ORIGIN__/img/poster/${streamId}.svg`,
      })
    }
  }
}

// rayon composé par le fournisseur et sorties de l'année, pour exercer les sélections de l'accueil
{
  const id = String(vodCategoryId++)
  vodCategories.push({ category_id: id, category_name: 'FR - NOUVEAUTÉS 2026' })
  const titles = ['Les Marées hautes', 'Dernier métro pour Séoul', 'La Ligne claire', 'Quartier nord', 'Un été à Tanger', 'Le Poids des silences', 'Nuit américaine 2', 'Les Insoumises']
  titles.forEach((title, index) => {
    const streamId = nextId++
    vodStreams.push({
      stream_id: streamId,
      name: `FR - ${title} (${index % 3 === 0 ? 2025 : 2026})`,
      category_id: id,
      container_extension: index % 2 ? 'mkv' : 'mp4',
      rating: (6.2 + (index * 0.37) % 2.4).toFixed(1),
      added: String(1795000000 + index * 3600),
      stream_icon: `__ORIGIN__/img/poster/${encodeURIComponent(title)}.svg`,
    })
  })
}

const seriesCategories = []
const seriesList = []
let seriesCategoryId = 200
const SHOWS = ['Le Bureau des légendes', 'Lupin', 'Dix pour cent', 'Engrenages', 'Baron noir', 'HPI', 'Validé', 'Hippocrate']
for (const lang of ['FR', 'ES', 'UK']) {
  for (const genre of ['DRAME', 'COMÉDIE', 'POLICIER']) {
    const id = String(seriesCategoryId++)
    seriesCategories.push({ category_id: id, category_name: `${lang} - ${genre}` })
    for (let i = 0; i < 40; i++) {
      const seriesId = nextId++
      const name = lang === 'FR' && genre === 'DRAME' && SHOWS[i] ? SHOWS[i] : `${WORDS[i % WORDS.length]} ${WORDS[(i * 5 + 2) % WORDS.length].toLowerCase()} ${i + 1}`
      seriesList.push({
        series_id: seriesId,
        name: `${lang} - ${name} (${2005 + (seriesId % 21)})`,
        category_id: id,
        cover: seriesId % 6 === 0 ? '' : `__ORIGIN__/img/poster/${seriesId}.svg`,
        last_modified: String(1790000000 - seriesId * 7200),
        rating_5based: (2.5 + (seriesId % 25) / 10).toFixed(1),
      })
    }
  }
}

function seriesInfo(seriesId) {
  const episodes = {}
  for (const season of [1, 2]) {
    episodes[season] = Array.from({ length: 8 }, (_, index) => ({
      id: String(seriesId * 100 + season * 10 + index),
      episode_num: index + 1,
      title: `Épisode ${index + 1}`,
      // un épisode sur trois en mkv, comme chez les vrais fournisseurs
      container_extension: index % 3 === 2 ? 'mkv' : 'mp4',
      season,
      info: { duration: '00:52:00' },
    }))
  }
  return { info: { plot: 'Une série de démonstration, deux saisons de huit épisodes.', genre: 'Drame' }, episodes }
}

// Fichiers factices pour exercer l'analyse des films en échec.
const bytesOf = (text) => [...text].map((char) => char.charCodeAt(0))
const size = (value) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]
const stsd = (code) => [...size(32), ...bytesOf('stsd'), 0, 0, 0, 0, ...size(1), ...size(16), ...bytesOf(code), 0, 0, 0, 0, 0, 0, 0, 0]
function fakeMp4(codes) {
  const tracks = codes.flatMap(stsd)
  return Buffer.from([
    ...size(16), ...bytesOf('ftyp'), ...bytesOf('isom'), 0, 0, 0, 0,
    ...size(8 + tracks.length), ...bytesOf('moov'), ...tracks, ...size(8), ...bytesOf('mdat'),
  ])
}
const FAKE = {
  mkv: { type: 'video/x-matroska', body: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(2048)]) },
  ts: { type: 'video/mp2t', body: Buffer.alloc(188 * 20, 0x47) },
  hevc: { type: 'video/mp4', body: fakeMp4(['hev1', 'dtsc']) },
}
// film mp4 illisible : HEVC étiqueté hev1 et son DTS
const BROKEN_MP4 = vodStreams.find((stream) => stream.name.includes('Spider-Man')).stream_id

function svg(label, width, height, seed) {
  const hue = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360
  const text = label.replace(/[<&>]/g, '').slice(0, 14)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="hsl(${hue} 55% 32%)"/><circle cx="${width * 0.8}" cy="${height * 0.2}" r="${width * 0.4}" fill="hsl(${(hue + 40) % 360} 60% 45%)"/><text x="50%" y="55%" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${width / 6}" fill="#fff">${text}</text></svg>`
}

const CORS = { 'Access-Control-Allow-Origin': '*' }

http
  .createServer((req, res) => {
    const origin = `http://${req.headers.host}`
    const url = new URL(req.url, origin)
    const json = (data) => {
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data).replaceAll('__ORIGIN__', origin))
    }
    const redirect = (location) => {
      res.writeHead(302, { ...CORS, Location: location })
      res.end()
    }
    const missing = () => {
      res.writeHead(404, CORS)
      res.end('Introuvable')
    }

    if (url.pathname === '/player_api.php') {
      const granted = url.searchParams.get('username') === 'demo' && url.searchParams.get('password') === 'demo'
      if (!granted) return json({ user_info: { auth: 0 } })
      switch (url.searchParams.get('action')) {
        case 'get_live_categories': return json(liveCategories)
        case 'get_live_streams': return json(liveStreams)
        case 'get_vod_categories': return json(vodCategories)
        case 'get_vod_streams': return json(vodStreams)
        case 'get_series_categories': return json(seriesCategories)
        case 'get_series': return json(seriesList)
        case 'get_series_info': return json(seriesInfo(Number(url.searchParams.get('series_id'))))
        case 'get_vod_info':
          return json({
            info: {
              plot: 'Un récit de démonstration : deux inconnus traversent le pays pour tenir une promesse faite vingt ans plus tôt.',
              genre: 'Drame, Aventure', duration: '01:52:00', backdrop_path: [`__ORIGIN__/img/backdrop/${url.searchParams.get('vod_id')}.svg`],
            },
          })
        default:
          return json({ user_info: { auth: 1, status: 'Active', exp_date: '1821052800', max_connections: '1' } })
      }
    }
    const live = /^\/live\/demo\/demo\/(\d+)\.m3u8$/.exec(url.pathname)
    // une chaîne sur neuf hors antenne, pour exercer le message d'erreur
    if (live) return Number(live[1]) % 9 === 0 ? missing() : redirect(HLS)
    const file = /^\/(movie|series)\/demo\/demo\/(\d+)\.(\w+)$/.exec(url.pathname)
    if (file) {
      const extension = file[3]
      const fake = Number(file[2]) === BROKEN_MP4 && extension === 'mp4' ? FAKE.hevc : FAKE[extension]
      if (extension === 'm3u8') return missing()
      if (!fake) return redirect(MP4)
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '')
      if (range) {
        const start = Number(range[1])
        const end = Math.min(range[2] ? Number(range[2]) : fake.body.length - 1, fake.body.length - 1)
        res.writeHead(206, { ...CORS, 'Content-Type': fake.type, 'Content-Range': `bytes ${start}-${end}/${fake.body.length}`, 'Accept-Ranges': 'bytes' })
        return res.end(fake.body.subarray(start, end + 1))
      }
      res.writeHead(200, { ...CORS, 'Content-Type': fake.type, 'Accept-Ranges': 'bytes' })
      return res.end(fake.body)
    }
    const image = /^\/img\/(logo|poster|backdrop)\/(.+)\.svg$/.exec(url.pathname)
    if (image) {
      const name = decodeURIComponent(image[2])
      const size = image[1] === 'logo' ? [120, 120] : image[1] === 'poster' ? [200, 300] : [640, 360]
      res.writeHead(200, { ...CORS, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=3600' })
      return res.end(svg(image[1] === 'logo' ? name : '', size[0], size[1], name))
    }
    missing()
  })
  .listen(PORT, () => console.log(`Faux fournisseur : http://localhost:${PORT} (demo / demo), ${liveStreams.length} flux, ${vodStreams.length} films`))
