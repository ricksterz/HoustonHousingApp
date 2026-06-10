import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// VITE_BASE is set for GitHub Pages builds (e.g. /HoustonHousingApp/).
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
