#!/usr/bin/env node
/**
 * Compila el proceso principal y el preload de Electron con esbuild.
 *
 * Las dependencias de `node_modules` se dejan externas (`packages: external`):
 * electron-builder las incluye en el paquete y better-sqlite3 conserva sus
 * binarios N-API precompilados para cada plataforma.
 */

import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(rootDir, 'dist-electron')

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const common = {
  bundle: true,
  platform: 'node',
  target: 'node24',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
}

await build({
  ...common,
  format: 'esm',
  entryPoints: [path.join(rootDir, 'electron', 'main.ts')],
  outfile: path.join(outDir, 'main.js'),
})

await build({
  ...common,
  format: 'cjs',
  entryPoints: [path.join(rootDir, 'electron', 'preload.ts')],
  outfile: path.join(outDir, 'preload.cjs'),
})

console.log('[build] Electron main/preload compilados en dist-electron/')
