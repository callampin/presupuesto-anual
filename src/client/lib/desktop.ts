/**
 * Utilidades para descargar respaldos tanto en el navegador (modo dev) como
 * dentro de Electron, donde se usa el diálogo nativo de guardado.
 */

import type { DesktopBridge } from '@shared/desktop'

declare global {
  interface Window {
    desktop?: DesktopBridge
  }
}

export interface SaveBackupOutcome {
  saved: boolean
  path?: string
}

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.desktop)
}

export function backupFileName(kind: 'json' | 'db'): string {
  const date = new Date().toISOString().slice(0, 10)
  return kind === 'json'
    ? `finanzas-backup-${date}.json`
    : `finanzas-${date}.db`
}

/**
 * Descarga un endpoint de respaldo.
 *
 * - Electron: pide los bytes y los guarda con `dialog.showSaveDialog`.
 * - Navegador: usa una descarga normal del enlace.
 */
export async function saveBackup(
  path: string,
  fileName: string,
): Promise<SaveBackupOutcome> {
  if (window.desktop) {
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`No se pudo generar el respaldo (HTTP ${response.status})`)
    }
    const data = await response.arrayBuffer()
    const result = await window.desktop.saveBackup(fileName, data)
    if (!result.saved && result.error) throw new Error(result.error)
    return { saved: result.saved, path: result.path }
  }

  const link = document.createElement('a')
  link.href = path
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  return { saved: true }
}
