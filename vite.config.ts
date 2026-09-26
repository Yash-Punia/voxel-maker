import path from 'node:path'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    chunkSizeWarningLimit: 800,
  },
  test: {
    // src/core is pure by rule, so the unit tests need no DOM. The few modules
    // that touch canvas or IndexedDB are covered by the manual test scripts in
    // docs, not here.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
