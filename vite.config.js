import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set the base path for GitHub Pages deployment
  // If deploying to https://<USER>.github.io/nationalParks/
  base: '/nationalParks/',
})
