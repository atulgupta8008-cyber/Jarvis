import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress chunk size or circular dependency warnings from aborting Vercel build
        if (warning.code === 'CHUNK_SIZE_LIMIT' || warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('plotly.js') || id.includes('react-plotly')) {
              return 'plotly-vendor';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            if (id.includes('mermaid')) {
              return 'mermaid-vendor';
            }
            if (id.includes('katex')) {
              return 'katex-vendor';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('axios')) {
              return 'react-vendor';
            }
            return 'other-vendor';
          }
        }
      }
    }
  }
})

