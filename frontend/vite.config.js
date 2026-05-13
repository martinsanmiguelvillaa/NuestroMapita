import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    // Proxy para desarrollo local sin Docker:
    // Redirige llamadas /auth, /places, etc. al backend FastAPI en :8000
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/places': { target: 'http://localhost:8000', changeOrigin: true },
      '/photos': { target: 'http://localhost:8000', changeOrigin: true },
      '/letters': { target: 'http://localhost:8000', changeOrigin: true },
      '/search': { target: 'http://localhost:8000', changeOrigin: true },
      '/map': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
