'use strict'

/**
 * Hook `afterPack` de electron-builder.
 *
 * better-sqlite3 incluye binarios N-API para todas las plataformas. En el
 * paquete final solo se conserva el de la plataforma/arquitectura compilada
 * (más la variante musl en Linux), reduciendo el tamaño del instalador.
 */

const fs = require('node:fs')
const path = require('node:path')

const ARCH_NAMES = {
  0: 'ia32',
  1: 'x64',
  2: 'armv7l',
  3: 'arm64',
  4: 'universal',
}

module.exports = async function afterPack(context) {
  const platform = context.electronPlatformName
  const arch = ARCH_NAMES[context.arch] ?? 'x64'
  const prebuildsDir = path.join(
    context.appOutDir,
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'prebuilds',
  )

  if (!fs.existsSync(prebuildsDir)) return

  const keep = new Set([`${platform}-${arch}.node`])
  if (platform === 'linux') keep.add(`linuxmusl-${arch}.node`)

  for (const file of fs.readdirSync(prebuildsDir)) {
    if (!file.endsWith('.node')) continue
    if (!keep.has(file)) {
      fs.rmSync(path.join(prebuildsDir, file), { force: true })
    }
  }
}
