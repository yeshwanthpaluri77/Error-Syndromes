import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Relative base so the same build works on Vercel, Netlify, or a GitHub Pages sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: {
    // One small game bundle (~170 kB gzipped incl. React + Framer Motion); no need to split.
    chunkSizeWarningLimit: 650,
  },
})
