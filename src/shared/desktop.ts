/**
 * Contrato del puente seguro entre el renderer y el proceso principal.
 * Solo expone lo necesario para guardar respaldos con el diálogo nativo.
 */

export interface SaveBackupResult {
  saved: boolean
  path?: string
  error?: string
}

export interface DesktopBridge {
  saveBackup(fileName: string, data: ArrayBuffer): Promise<SaveBackupResult>
}
