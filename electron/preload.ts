/**
 * Preload de Electron.
 *
 * Se ejecuta con `sandbox: true` y `contextIsolation: true`: solo expone el
 * método para guardar respaldos mediante un diálogo nativo.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopBridge, SaveBackupResult } from '../src/shared/desktop'

const desktop: DesktopBridge = {
  saveBackup: (fileName: string, data: ArrayBuffer) =>
    ipcRenderer.invoke('desktop:save-backup', {
      fileName,
      data,
    }) as Promise<SaveBackupResult>,
}

contextBridge.exposeInMainWorld('desktop', desktop)
