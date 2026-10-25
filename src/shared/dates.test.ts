import { describe, expect, it } from 'vitest'
import {
  buildMonthDate,
  daysInMonth,
  isValidIsoDate,
  monthKey,
  shiftMonthDate,
} from './dates'

describe('daysInMonth', () => {
  it('conoce los meses y años bisiestos', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2025, 2)).toBe(28)
    expect(daysInMonth(2025, 4)).toBe(30)
    expect(daysInMonth(2025, 12)).toBe(31)
  })

  it('rechaza meses inválidos', () => {
    expect(() => daysInMonth(2025, 0)).toThrow()
    expect(() => daysInMonth(2025, 13)).toThrow()
  })
})

describe('isValidIsoDate', () => {
  it('valida fechas ISO reales', () => {
    expect(isValidIsoDate('2025-01-31')).toBe(true)
    expect(isValidIsoDate('2024-02-29')).toBe(true)
    expect(isValidIsoDate('2025-02-29')).toBe(false)
    expect(isValidIsoDate('2025-13-01')).toBe(false)
    expect(isValidIsoDate('31/01/2025')).toBe(false)
  })
})

describe('shiftMonthDate (equivalente a EDATE del Excel)', () => {
  it('suma meses conservando el día', () => {
    expect(shiftMonthDate('2025-01-15', 1)).toBe('2025-02-15')
    expect(shiftMonthDate('2025-01-31', 1)).toBe('2025-02-28')
    expect(shiftMonthDate('2024-01-31', 1)).toBe('2024-02-29')
    expect(shiftMonthDate('2024-03-31', -1)).toBe('2024-02-29')
  })

  it('cruza el cambio de año en ambos sentidos', () => {
    expect(shiftMonthDate('2024-12-31', 1)).toBe('2025-01-31')
    expect(shiftMonthDate('2025-01-31', -1)).toBe('2024-12-31')
    expect(shiftMonthDate('2024-01-31', 12)).toBe('2025-01-31')
  })

  it('rechaza fechas y desplazamientos inválidos', () => {
    expect(() => shiftMonthDate('2025-02-30', 1)).toThrow()
    expect(() => shiftMonthDate('2025-01-15', 1.5)).toThrow()
  })
})

describe('buildMonthDate', () => {
  it('ajusta el día al último día del mes destino', () => {
    expect(buildMonthDate(2025, 2, 31)).toBe('2025-02-28')
    expect(buildMonthDate(2024, 2, 31)).toBe('2024-02-29')
    expect(buildMonthDate(2025, 4, 31)).toBe('2025-04-30')
    expect(buildMonthDate(2025, 1, 10)).toBe('2025-01-10')
  })
})

describe('monthKey', () => {
  it('formatea el periodo como YYYY-MM', () => {
    expect(monthKey(2025, 1)).toBe('2025-01')
    expect(monthKey(2026, 12)).toBe('2026-12')
  })
})
