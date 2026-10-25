/**
 * Punto de entrada del servidor local (modo navegador / desarrollo).
 *
 * La app empaquetada con Electron NO usa este archivo: sirve la API a través
 * del protocolo interno `app://` (ver `electron/main.ts`).
 *
 * Aquí se conserva el servidor HTTP para desarrollo y para abrir la app en el
 * navegador. Escucha solo en 127.0.0.1 y, si el puerto preferido está ocupado,
 * usa uno efímero asignado por el sistema.
 */

import { serve, type ServerType } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app'
import { DEFAULT_DB_PATH, closeDatabase, getDatabase } from './db'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(currentDir, '../../dist')

const connection = getDatabase()
const app = createApp(connection)

if (fs.existsSync(distDir)) {
  const relativeDist = path.relative(process.cwd(), distDir) || '.'
  app.use('*', serveStatic({ root: relativeDist }))
  app.get('*', (c) => {
    const indexHtml = path.join(distDir, 'index.html')
    if (!fs.existsSync(indexHtml)) {
      return c.text('Frontend no compilado. Ejecuta "pnpm build".', 503)
    }
    return c.html(fs.readFileSync(indexHtml, 'utf8'))
  })
}

interface ListenResult {
  server: ServerType
  port: number
}

/** Intenta escuchar en un puerto concreto (0 = efímero). */
function listenOnPort(port: number): Promise<ListenResult> {
  return new Promise((resolve, reject) => {
    let settled = false
    const server = serve(
      { fetch: app.fetch, port, hostname: '127.0.0.1' },
      (info) => {
        settled = true
        resolve({ server, port: info.port })
      },
    )
    server.once('error', (error: Error) => {
      if (!settled) reject(error)
    })
  })
}

async function start(): Promise<void> {
  const preferredPort = Number(process.env.PORT ?? 3001)
  let result: ListenResult

  try {
    result = await listenOnPort(preferredPort)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'EADDRINUSE') {
      console.error('[api] No se pudo iniciar el servidor:', error)
      closeDatabase()
      process.exit(1)
    }
    console.warn(
      `[api] El puerto ${preferredPort} está ocupado; usando un puerto libre asignado por el sistema.`,
    )
    result = await listenOnPort(0)
  }

  console.log(`[api] Servidor local disponible en http://127.0.0.1:${result.port}`)
  console.log(`[db] SQLite: ${DEFAULT_DB_PATH}`)

  function shutdown(): void {
    result.server.close(() => {
      closeDatabase()
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('[api] Error fatal al iniciar:', error)
  closeDatabase()
  process.exit(1)
})
