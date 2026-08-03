import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      // We already ship our own public/manifest.webmanifest + <link> tag — don't generate a second one.
      manifest: false,
      registerType: 'autoUpdate',
      includeAssets: ['pt_favicon.png', 'tc_logo.png', 'icons.svg', 'favicon.svg'],
      workbox: {
        // Precache the whole built app shell (JS/CSS/HTML/images) so it opens with zero connectivity.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Never let the AI/Drive Worker calls be intercepted by the SW — they must fail loudly offline, not serve stale JSON.
            urlPattern: ({ url }) => url.hostname.endsWith('workers.dev'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  // GitHub Pages needs the repo path in production; local dev is simpler at /.
  base: mode === 'production' ? '/field-inspection-system/' : '/',
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
}))
