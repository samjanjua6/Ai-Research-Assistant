import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // In dev, proxy API and SSE calls to the FastAPI backend
    proxy: {
      '/research': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Output to frontend/dist — FastAPI will serve this folder in production
    outDir: 'dist',
    emptyOutDir: true,
  },
})
