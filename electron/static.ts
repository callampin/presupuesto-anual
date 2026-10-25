/**
 * Utilidades puras para servir el frontend empaquetado desde `app://`.
 *
 * Se mantienen separadas de Electron para poder probarlas con Vitest.
 */

import path from 'node:path'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

export function contentTypeFor(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Resuelve una ruta del protocolo a un archivo dentro de `dist/`.
 * Devuelve `null` si intenta salir de la carpeta o si la URL es inválida.
 */
export function resolveStaticPath(distDir: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const relative = decoded.replace(/^\/+/, '') || 'index.html'
  const root = path.resolve(distDir)
  const resolved = path.resolve(root, relative)

  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
  return resolved
}

/** `true` si la ruta parece un archivo con extensión (no una ruta SPA). */
export function looksLikeAsset(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop() ?? ''
  return lastSegment.includes('.')
}
