/**
 * Protocolo interno `app://presupuesto/` de la app empaquetada.
 *
 * Evita abrir un puerto TCP: la API de Hono se invoca en el mismo proceso y
 * los archivos del frontend se leen de `dist/`.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { Hono } from 'hono'
import { contentTypeFor, looksLikeAsset, resolveStaticPath } from './static'

export const APP_SCHEME = 'app'
export const APP_HOST = 'presupuesto'
export const APP_URL = `${APP_SCHEME}://${APP_HOST}/`

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
}

export interface ProtocolOptions {
  distDir: string
  api: Hono
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile()
  } catch {
    return false
  }
}

async function fileResponse(filePath: string, method: string): Promise<Response> {
  const data = await fs.readFile(filePath)
  const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`)
  const isHtml = filePath.endsWith('.html')

  return new Response(method === 'HEAD' ? null : new Uint8Array(data), {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : isHtml
          ? 'no-store'
          : 'public, max-age=3600',
    },
  })
}

/**
 * Devuelve el handler para `protocol.handle('app', ...)`.
 * La API se atiende primero y el resto se resuelve contra `dist/`.
 */
export function createAppProtocolHandler({ distDir, api }: ProtocolOptions) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    if (url.host !== APP_HOST) return textResponse('Host no permitido', 404)

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      try {
        return await api.fetch(request)
      } catch (error) {
        console.error('[app] Error en la API:', error)
        return textResponse('Error interno', 500)
      }
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return textResponse('Método no permitido', 405)
    }

    const resolved = resolveStaticPath(distDir, url.pathname)
    if (!resolved) return textResponse('Ruta inválida', 400)

    if (await isFile(resolved)) {
      return fileResponse(resolved, request.method)
    }

    // Fallback de SPA: solo para rutas sin extensión (el router usa hash).
    if (looksLikeAsset(url.pathname)) return textResponse('Archivo no encontrado', 404)

    const indexHtml = path.join(distDir, 'index.html')
    if (!(await isFile(indexHtml))) {
      return textResponse('Frontend no compilado. Ejecuta "pnpm build".', 503)
    }
    return fileResponse(indexHtml, request.method)
  }
}
