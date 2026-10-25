import { describe, expect, it } from 'vitest'
import {
  annualRateToMonthly,
  monthsToYearsValue,
  monthlyRateToAnnualPercent,
  roundDecimal,
  yearsLabelFromMonths,
  yearsToMonths,
} from './compound'

describe('conversión de tasas', () => {
  it('convierte una tasa anual efectiva a mensual', () => {
    const monthly = annualRateToMonthly(12)
    expect(monthly).toBeCloseTo(0.00948879, 8)
    expect((1 + monthly) ** 12 - 1).toBeCloseTo(0.12, 10)
  })

  it('convierte una tasa mensual a anual efectiva', () => {
    expect(monthlyRateToAnnualPercent(0.06)).toBeCloseTo(101.2197, 3)
    expect(monthlyRateToAnnualPercent(0)).toBe(0)
  })

  it('hace round-trip anual → mensual → anual', () => {
    for (const annual of [-50, 0, 3.5, 7, 12, 25]) {
      expect(monthlyRateToAnnualPercent(annualRateToMonthly(annual))).toBeCloseTo(annual, 8)
    }
  })
})

describe('conversión de plazos', () => {
  it('convierte años a meses enteros', () => {
    expect(yearsToMonths(1)).toBe(12)
    expect(yearsToMonths(2)).toBe(24)
    expect(yearsToMonths(2.5)).toBe(30)
    expect(yearsToMonths(0.5)).toBe(6)
  })

  it('formatea meses a años para el input', () => {
    expect(monthsToYearsValue(24)).toBe('2')
    expect(monthsToYearsValue(30)).toBe('2.5')
    expect(monthsToYearsValue(25)).toBe('2.08')
    expect(monthsToYearsValue(12)).toBe('1')
  })

  it('genera etiquetas legibles', () => {
    expect(yearsLabelFromMonths(12)).toBe('1 año')
    expect(yearsLabelFromMonths(24)).toBe('2 años')
    expect(yearsLabelFromMonths(30)).toBe('2.5 años')
  })

  it('redondea de forma estable', () => {
    expect(roundDecimal(7.000000000000001, 4)).toBe(7)
    expect(roundDecimal(101.2197000001, 4)).toBe(101.2197)
    expect(roundDecimal(2.083333, 2)).toBe(2.08)
  })
})
