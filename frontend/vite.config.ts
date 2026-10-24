import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In development the API is proxied, so the app and API share an origin
// and property image URLs (/api/files/...) work without extra config.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
