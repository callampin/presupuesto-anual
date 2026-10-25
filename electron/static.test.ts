import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { contentTypeFor, looksLikeAsset, resolveStaticPath } from './static'

const distDir = path.resolve('/app/dist')

describe('resolveStaticPath', () => {
  it('resuelve archivos dentro de dist', () => {
    expect(resolveStaticPath(distDir, '/assets/index.js')).toBe(
      path.join(distDir, 'assets', 'index.js'),
    )
  })

  it('usa index.html para la raíz', () => {
    expect(resolveStaticPath(distDir, '/')).toBe(path.join(distDir, 'index.html'))
  })

  it('decodifica URLs con espacios', () => {
    expect(resolveStaticPath(distDir, '/assets/fuente%20uno.woff2')).toBe(
      path.join(distDir, 'assets', 'fuente uno.woff2'),
    )
  })

  it('rechaza rutas que salen de dist', () => {
    expect(resolveStaticPath(distDir, '/../../etc/passwd')).toBeNull()
    expect(resolveStaticPath(distDir, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull()
  })

  it('rechaza URLs mal codificadas', () => {
    expect(resolveStaticPath(distDir, '/%E0%A4%A')).toBeNull()
  })
})

describe('looksLikeAsset', () => {
  it('distingue rutas de archivos de rutas SPA', () => {
    expect(looksLikeAsset('/assets/index.js')).toBe(true)
    expect(looksLikeAsset('/')).toBe(false)
    expect(looksLikeAsset('/anual')).toBe(false)
  })
})

describe('contentTypeFor', () => {
  it('asigna los MIME principales', () => {
    expect(contentTypeFor('/app/index.html')).toContain('text/html')
    expect(contentTypeFor('/app/assets/app.js')).toContain('text/javascript')
    expect(contentTypeFor('/app/assets/app.css')).toContain('text/css')
    expect(contentTypeFor('/app/assets/font.woff2')).toBe('font/woff2')
    expect(contentTypeFor('/app/assets/icon.svg')).toBe('image/svg+xml')
    expect(contentTypeFor('/app/assets/data.bin')).toBe('application/octet-stream')
  })
})
