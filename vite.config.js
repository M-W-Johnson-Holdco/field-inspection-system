import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages needs the repo path in production; local dev is simpler at /.
  base: mode === 'production' ? '/field-inspection-system/' : '/',
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
}))
