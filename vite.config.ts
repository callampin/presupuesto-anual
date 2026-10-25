import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
// `pnpm dev` (scripts/dev.mjs) inyecta estos valores para que el proxy apunte
// siempre a la API real, incluso si el puerto 3001 estaba ocupado.
const apiPort = Number(process.env.FINANZAS_API_PORT ?? 3001)
const clientPort = Number(process.env.FINANZAS_CLIENT_PORT ?? 5173)

export default defineConfig({
  root: path.join(rootDir, 'src/client'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(rootDir, 'src/client'),
      '@shared': path.join(rootDir, 'src/shared'),
    },
  },
  server: {
    port: clientPort,
    strictPort: process.env.FINANZAS_STRICT_PORT === '1',
    proxy: {
      // La API local se sirve bajo /api (puerto inyectado por scripts/dev.mjs)
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.join(rootDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', '@tanstack/react-query'],
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    root: rootDir,
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts'],
    environment: 'node',
  },
})
