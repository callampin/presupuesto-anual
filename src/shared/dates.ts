/**
 * Utilidades de fechas para el dominio financiero.
 *
 * Replican el comportamiento de `EDATE` de Excel (usado en el archivo original
 * para desplazar las fechas de pago un mes por hoja mensual): al sumar meses a
 * una fecha, el día se ajusta al último día del mes destino cuando este es más
 * corto (ej. 31 de enero + 1 mes = 28/29 de febrero).
 */

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Cantidad de días de un mes (month: 1–12). */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Mes inválido: ${year}-${month}`)
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Valida que una cadena sea una fecha ISO `YYYY-MM-DD` real. */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return false
  return day >= 1 && day <= daysInMonth(year, month)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Desplaza una fecha ISO un número de meses conservando el día (estilo EDATE).
 * Si el día no existe en el mes destino, se ajusta al último día de ese mes.
 */
export function shiftMonthDate(isoDate: string, months: number): string {
  const match = ISO_DATE_PATTERN.exec(isoDate)
  if (!match || !isValidIsoDate(isoDate)) {
    throw new Error(`Fecha ISO inválida: ${isoDate}`)
  }
  if (!Number.isInteger(months)) {
    throw new Error('El desplazamiento en meses debe ser un entero')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const targetIndex = year * 12 + (month - 1) + months
  const targetYear = Math.floor(targetIndex / 12)
  const targetMonth = (targetIndex % 12) + 1
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth))

  return `${targetYear}-${pad2(targetMonth)}-${pad2(targetDay)}`
}

/**
 * Construye una fecha ISO para un año, mes y día, ajustando el día al último
 * día del mes si es necesario (usado al inicializar meses desde el catálogo).
 */
export function buildMonthDate(year: number, month: number, day: number): string {
  const safeDay = Math.min(Math.max(1, Math.trunc(day)), daysInMonth(year, month))
  return `${year}-${pad2(month)}-${pad2(safeDay)}`
}

/** Clave de periodo `YYYY-MM` (útil para agrupar datos). */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`
}
