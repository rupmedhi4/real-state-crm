import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In development the API is proxied, so the app and API share an origin
// and property image URLs (/api/files/...) work without extra config.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  // A tunnel (cloudflared/ngrok) serves the dev server over HTTPS on a host
  // Vite does not know, so that host has to be allowed and the HMR socket
  // pointed at the public port instead of the local one.
  const tunnelHost = env.VITE_TUNNEL_HOST
  return {
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: tunnelHost ? [tunnelHost] : [],
      hmr: tunnelHost ? { host: tunnelHost, protocol: 'wss', clientPort: 443 } : undefined,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
