/**
 * Conversiones de la calculadora de interés compuesto.
 *
 * La interfaz trabaja con **tasa anual efectiva** y **plazo en años**, pero el
 * motor y la base de datos usan tasa mensual y meses. La conversión anual →
 * mensual es geométrica: al cabo de 12 meses el rendimiento acumulado es
 * exactamente la tasa anual indicada.
 */

/** Convierte una tasa anual efectiva (%) a tasa mensual (fracción). */
export function annualRateToMonthly(annualPercent: number): number {
  return (1 + annualPercent / 100) ** (1 / 12) - 1
}

/** Convierte una tasa mensual (fracción) a tasa anual efectiva (%). */
export function monthlyRateToAnnualPercent(monthlyRate: number): number {
  return ((1 + monthlyRate) ** 12 - 1) * 100
}

/** Redondea a una cantidad fija de decimales. */
export function roundDecimal(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Convierte años (puede tener decimales) a meses enteros. */
export function yearsToMonths(years: number): number {
  return Math.round(years * 12)
}

/** Valor de años para mostrar en un input (ej. 24 meses → "2"). */
export function monthsToYearsValue(months: number): string {
  const years = roundDecimal(months / 12, 2)
  return String(years)
}

/** Etiqueta legible (ej. 30 meses → "2.5 años", 12 meses → "1 año"). */
export function yearsLabelFromMonths(months: number): string {
  const years = roundDecimal(months / 12, 2)
  return `${years} ${years === 1 ? 'año' : 'años'}`
}
