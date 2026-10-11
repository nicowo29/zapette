// Génère les icônes de l'application à partir d'un seul dessin : `npm run icons`.
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const CORAL = '#ff6b4a'
const INK = '#0a0c11'

// Z incliné, taillé comme un éclair : le « zap » de la zapette.
const mark = `<path fill="${INK}" transform="translate(32 32) skewX(-9) translate(-32 -32)" d="M15 13h34v9.500L29.500 41.500H49V51H15v-9.500L34.500 22.500H15z"/>`
  .replace(/9\.500/g, '9.5').replace(/29\.500/g, '29.5').replace(/41\.500/g, '41.5').replace(/34\.500/g, '34.5').replace(/22\.500/g, '22.5')

// onglet du navigateur : coins arrondis ; écran d'accueil iPhone : carré plein, iOS arrondit lui-même
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${CORAL}"/>${mark}</svg>`
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${CORAL}"/><g transform="translate(32 32) scale(0.84) translate(-32 -32)">${mark}</g></svg>`

const png = (svg, size) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toBuffer()

await writeFile('public/favicon.svg', favicon)
await writeFile('public/favicon-32.png', await png(favicon, 32))
await writeFile('public/apple-touch-icon.png', await png(square, 180))
await writeFile('public/icon-512.png', await png(square, 512))
console.log('icônes écrites dans public/')
