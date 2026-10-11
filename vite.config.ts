import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base relative : l'application doit fonctionner sous un sous-dossier (GitHub Pages) et en http:// simple
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180, strictPort: true },
})
