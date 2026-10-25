/** Formateo y parseo de montos, fechas y porcentajes según la configuración. */

import { MONTH_NAMES_ES } from '@shared/calculations'

export interface CurrencyConfig {
  currencySymbol: string
  currencyCode: string
  locale: string
  decimalPlaces: number
}

export const DEFAULT_CURRENCY: CurrencyConfig = {
  currencySymbol: '$',
  currencyCode: 'USD',
  locale: 'es-MX',
  decimalPlaces: 2,
}

/** Formatea un número con separadores y decimales del locale configurado. */
export function formatNumber(
  value: number,
  config: CurrencyConfig,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
    ...options,
  }).format(value)
}

/** Formatea un monto con el símbolo de moneda configurado. */
export function formatCurrency(value: number, config: CurrencyConfig): string {
  if (!Number.isFinite(value)) return '—'
  const formatted = formatNumber(Math.abs(value), config)
  return value < 0 ? `-${config.currencySymbol}${formatted}` : `${config.currencySymbol}${formatted}`
}

/** Formatea una fracción (0.42) como porcentaje ("42%"). */
export function formatPercent(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('es', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Formatea una fecha ISO `YYYY-MM-DD` sin desplazamiento de zona horaria. */
export function formatDate(isoDate: string | null, locale = 'es-MX'): string {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** Etiqueta "Octubre 2026" a partir de año y mes (1–12). */
export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_ES[month - 1] ?? ''} ${year}`
}

export interface AmountInputOptions {
  /** Máximo de decimales permitidos (por defecto 2). */
  maxDecimals?: number
  allowNegative?: boolean
}

/**
 * Formatea un monto mientras se escribe: agrupa miles con comas y conserva
 * los decimales con punto. Ej.: `1234567.8` → `1,234,567.8`.
 *
 * Acepta comas como separador de miles y también entradas tipo `1.234,56`
 * (en ese caso el último separador se interpreta como decimal).
 */
export function formatAmountInput(raw: string, options: AmountInputOptions = {}): string {
  const { maxDecimals = 2, allowNegative = true } = options

  let cleaned = raw.replace(/[^\d.,-]/g, '')
  if (!allowNegative) cleaned = cleaned.replace(/-/g, '')

  const isNegative = allowNegative && cleaned.startsWith('-')
  const body = cleaned.replace(/-/g, '')

  if (body === '') return isNegative ? '-' : ''

  const lastDot = body.lastIndexOf('.')
  const lastComma = body.lastIndexOf(',')
  const hasDot = lastDot !== -1
  const hasComma = lastComma !== -1
  const endsWithSeparator = /[.,]$/.test(body)

  let integer = ''
  let decimals = ''
  let hasDecimalSeparator = false

  if (hasDot && hasComma) {
    // El último separador se interpreta como decimal.
    const separatorIndex = Math.max(lastDot, lastComma)
    integer = body.slice(0, separatorIndex).replace(/[.,]/g, '')
    decimals = body.slice(separatorIndex + 1).replace(/[.,]/g, '')
    hasDecimalSeparator = true
  } else if (hasDot) {
    integer = body.slice(0, lastDot)
    decimals = body.slice(lastDot + 1).replace(/\./g, '')
    hasDecimalSeparator = true
  } else if (hasComma) {
    if (endsWithSeparator) {
      // Coma final: se convierte en separador decimal (0,5 → 0.5).
      integer = body.slice(0, lastComma).replace(/,/g, '')
      hasDecimalSeparator = true
    } else {
      // Comas internas: separadores de miles que ya insertó el formateador.
      integer = body.replace(/,/g, '')
    }
  } else {
    integer = body
  }

  if (maxDecimals <= 0) {
    hasDecimalSeparator = false
    decimals = ''
  } else {
    decimals = decimals.slice(0, maxDecimals)
  }

  if (integer === '' && hasDecimalSeparator) integer = '0'
  if (integer === '') return isNegative ? '-' : ''

  integer = integer.replace(/^0+(?=\d)/, '') || '0'
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = isNegative ? '-' : ''

  return hasDecimalSeparator ? `${sign}${grouped}.${decimals}` : `${sign}${grouped}`
}

/**
 * Convierte texto libre en un monto. Acepta `1.234,56`, `1234.56`, `1,234.56`,
 * con o sin símbolo de moneda. Devuelve `null` si no es un número válido.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === ',') return null

  const negative = cleaned.startsWith('-')
  const unsigned = cleaned.replace(/-/g, '')
  const lastDot = unsigned.lastIndexOf('.')
  const lastComma = unsigned.lastIndexOf(',')

  let normalized = unsigned
  if (lastDot !== -1 && lastComma !== -1) {
    // El último separador se interpreta como decimal.
    if (lastComma > lastDot) {
      normalized = unsigned.replace(/\./g, '').replace(/,/g, '.')
    } else {
      normalized = unsigned.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    const parts = unsigned.split(',')
    normalized =
      parts.length === 2 && parts[1]!.length <= 2
        ? `${parts[0]}.${parts[1]}`
        : unsigned.replace(/,/g, '')
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return negative ? -Math.abs(value) : value
}

/** Clasifica el consumo de un presupuesto (AGENTS.md §5.1). */
export type BudgetHealth = 'ok' | 'warning' | 'over'

export function budgetHealth(budget: number, actual: number): BudgetHealth {
  if (budget <= 0) return actual > 0 ? 'over' : 'ok'
  const ratio = actual / budget
  if (ratio > 1) return 'over'
  if (ratio >= 0.85) return 'warning'
  return 'ok'
}
