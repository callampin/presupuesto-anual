import { describe, expect, it } from 'vitest'
import {
  budgetHealth,
  formatAmountInput,
  formatCurrency,
  formatDate,
  formatMonthLabel,
  parseAmountInput,
  type CurrencyConfig,
} from './format'

const config: CurrencyConfig = {
  currencySymbol: '$',
  currencyCode: 'USD',
  locale: 'en-US',
  decimalPlaces: 2,
}

describe('formatCurrency', () => {
  it('formatea con símbolo, separadores y decimales', () => {
    expect(formatCurrency(1234.5, config)).toBe('$1,234.50')
    expect(formatCurrency(0, config)).toBe('$0.00')
    expect(formatCurrency(-1234.5, config)).toBe('-$1,234.50')
  })

  it('respeta símbolo y decimales configurados', () => {
    expect(formatCurrency(10, { ...config, currencySymbol: 'S/', decimalPlaces: 0 })).toBe('S/10')
  })

  it('maneja valores no finitos', () => {
    expect(formatCurrency(Number.NaN, config)).toBe('—')
  })
})

describe('parseAmountInput', () => {
  it('interpreta formato latino (1.234,56)', () => {
    expect(parseAmountInput('1.234,56')).toBe(1234.56)
    expect(parseAmountInput('$ 1.234,5')).toBe(1234.5)
  })

  it('interpreta formato anglosajón (1,234.56)', () => {
    expect(parseAmountInput('1,234.56')).toBe(1234.56)
    expect(parseAmountInput('$1,000')).toBe(1000)
  })

  it('acepta negativos y números simples', () => {
    expect(parseAmountInput('-250.75')).toBe(-250.75)
    expect(parseAmountInput('-1.234,5')).toBe(-1234.5)
    expect(parseAmountInput('42')).toBe(42)
    expect(parseAmountInput('0,5')).toBe(0.5)
  })

  it('devuelve null para entradas inválidas', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('   ')).toBeNull()
    expect(parseAmountInput('abc')).toBeNull()
    expect(parseAmountInput('-')).toBeNull()
  })
})

describe('formatAmountInput', () => {
  it('agrupa miles mientras se escribe', () => {
    expect(formatAmountInput('1234')).toBe('1,234')
    expect(formatAmountInput('1234567')).toBe('1,234,567')
    expect(formatAmountInput('1234567890')).toBe('1,234,567,890')
  })

  it('conserva decimales y estados intermedios', () => {
    expect(formatAmountInput('1234.')).toBe('1,234.')
    expect(formatAmountInput('1234.5')).toBe('1,234.5')
    expect(formatAmountInput('1234.56')).toBe('1,234.56')
    expect(formatAmountInput('1234,')).toBe('1,234.')
    expect(formatAmountInput('')).toBe('')
    expect(formatAmountInput('-')).toBe('-')
    expect(formatAmountInput('.')).toBe('0.')
  })

  it('limita decimales, normaliza ceros y conserva el signo', () => {
    expect(formatAmountInput('1234.567', { maxDecimals: 2 })).toBe('1,234.56')
    expect(formatAmountInput('1234.5', { maxDecimals: 0 })).toBe('1,234')
    expect(formatAmountInput('000123')).toBe('123')
    expect(formatAmountInput('0')).toBe('0')
    expect(formatAmountInput('-1234.5')).toBe('-1,234.5')
    expect(formatAmountInput('-1234', { allowNegative: false })).toBe('1,234')
  })

  it('interpreta valores pegados con separadores', () => {
    expect(formatAmountInput('1.234,56')).toBe('1,234.56')
    expect(formatAmountInput('1,234.56')).toBe('1,234.56')
    expect(formatAmountInput('$ 1,234.5')).toBe('1,234.5')
    expect(formatAmountInput('1,234,567')).toBe('1,234,567')
  })

  it('hace round-trip con parseAmountInput', () => {
    const formatted = formatAmountInput('1234567.89')
    expect(formatted).toBe('1,234,567.89')
    expect(parseAmountInput(formatted)).toBe(1234567.89)
  })
})

describe('budgetHealth', () => {
  it('clasifica el consumo del presupuesto', () => {
    expect(budgetHealth(100, 50)).toBe('ok')
    expect(budgetHealth(100, 84.99)).toBe('ok')
    expect(budgetHealth(100, 85)).toBe('warning')
    expect(budgetHealth(100, 100)).toBe('warning')
    expect(budgetHealth(100, 100.01)).toBe('over')
  })

  it('trata presupuesto cero con gasto como sobregiro', () => {
    expect(budgetHealth(0, 0)).toBe('ok')
    expect(budgetHealth(0, 10)).toBe('over')
  })
})

describe('formatDate / formatMonthLabel', () => {
  it('formatea fechas ISO y nulos', () => {
    expect(formatDate('2026-10-24', 'es-MX')).toContain('2026')
    expect(formatDate(null)).toBe('—')
    expect(formatDate('no-es-fecha')).toBe('—')
  })

  it('etiqueta el mes en español', () => {
    expect(formatMonthLabel(2026, 10)).toBe('Octubre 2026')
    expect(formatMonthLabel(2026, 1)).toBe('Enero 2026')
  })
})
