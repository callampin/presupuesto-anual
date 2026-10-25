import { describe, expect, it } from 'vitest'
import {
  MONTH_NAMES_ES,
  buildAnnualSummary,
  buildCompoundProjection,
  buildMonthlyCascade,
  buildMonthlySummary,
  buildMonthlyTotals,
  createEmptyMonthlyData,
  roundMoney,
  sumMoney,
  sumTransactionsByCategory,
  totalExpenses,
} from './calculations'
import type { MonthlyData } from './types'

/** Mes de prueba que ejercita los 5 bloques y el registro de gastos. */
function buildFixtureMonth(): MonthlyData {
  return {
    incomes: [
      {
        id: 1,
        name: 'Quincena 1',
        date: '2025-01-15',
        expectedAmount: 2500,
        actualAmount: 2600,
      },
      {
        id: 2,
        name: 'Quincena 2',
        date: '2025-01-30',
        expectedAmount: 2500,
        actualAmount: 2400,
      },
    ],
    bills: [
      {
        id: 3,
        name: 'Renta',
        dueDate: '2025-01-05',
        isPaid: true,
        budgetAmount: 1000,
        actualAmount: 1000,
      },
      {
        id: 4,
        name: 'Luz',
        dueDate: '2025-01-10',
        isPaid: true,
        budgetAmount: 200,
        actualAmount: 250,
      },
    ],
    expenseCategories: [
      { id: 1, name: 'Despensa', budgetAmount: 800 },
      { id: 2, name: 'Transporte', budgetAmount: 300 },
      { id: 3, name: 'Salud', budgetAmount: 0 },
    ],
    transactions: [
      { id: 1, categoryId: 1, amount: 120.5, date: '2025-01-03', notes: '' },
      { id: 2, categoryId: 1, amount: 79.5, date: '2025-01-09', notes: '' },
      { id: 3, categoryId: 2, amount: 50, date: '2025-01-12', notes: '' },
    ],
    savings: [
      { id: 1, name: 'Fondo de emergencia', projectedAmount: 500, actualAmount: 400 },
    ],
    debts: [{ id: 1, name: 'Tarjeta de crédito', expectedAmount: 300, actualAmount: 300 }],
  }
}

describe('utilidades monetarias', () => {
  it('suma y redondea al centavo evitando errores de coma flotante', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(sumMoney([])).toBe(0)
    expect(roundMoney(1234.567)).toBe(1234.57)
    expect(roundMoney(-1234.567)).toBe(-1234.57)
  })
})

describe('totales mensuales por bloque (hoja Ene..Dic)', () => {
  it('calcula los totales de los 5 bloques igual que el Excel', () => {
    const totals = buildMonthlyTotals(buildFixtureMonth())

    // Ingreso: E11 (esperado) / F11 (real)
    expect(totals.income).toEqual({ budget: 5000, actual: 5000 })
    // Facturas: E34 (presupuesto) / F34 (real)
    expect(totals.bills).toEqual({ budget: 1200, actual: 1250 })
    // Gastos: I34 (presupuesto) / J34 (real, derivado de transacciones)
    expect(totals.expenses.budget).toBe(1100)
    expect(totals.expenses.actual).toBe(250)
    // Ahorros: M34 / N34
    expect(totals.savings).toEqual({ budget: 500, actual: 400 })
    // Deuda: Q34 / R34
    expect(totals.debts).toEqual({ budget: 300, actual: 300 })
  })

  it('deriva el gasto real por categoría únicamente de las transacciones (SUMIF)', () => {
    const { byCategory } = totalExpenses(
      buildFixtureMonth().expenseCategories,
      buildFixtureMonth().transactions,
    )

    expect(byCategory).toEqual([
      { categoryId: 1, name: 'Despensa', budget: 800, actual: 200 },
      { categoryId: 2, name: 'Transporte', budget: 300, actual: 50 },
      { categoryId: 3, name: 'Salud', budget: 0, actual: 0 },
    ])
  })

  it('agrupa transacciones por categoría preservando categorías vacías', () => {
    const grouped = sumTransactionsByCategory(buildFixtureMonth().transactions)
    expect(grouped.get(1)).toBe(200)
    expect(grouped.get(2)).toBe(50)
    expect(grouped.get(3)).toBeUndefined()
  })

  it('un mes vacío produce totales en cero', () => {
    const totals = buildMonthlyTotals(createEmptyMonthlyData())
    expect(totals.income).toEqual({ budget: 0, actual: 0 })
    expect(totals.bills).toEqual({ budget: 0, actual: 0 })
    expect(totals.expenses).toEqual({ budget: 0, actual: 0, byCategory: [] })
    expect(totals.savings).toEqual({ budget: 0, actual: 0 })
    expect(totals.debts).toEqual({ budget: 0, actual: 0 })
  })
})

describe('cascada de Restante (fila 35 del Excel)', () => {
  it('descuenta en orden Ingreso → Facturas → Gastos → Ahorros → Deuda (presupuesto)', () => {
    const { cascade } = buildMonthlySummary(buildFixtureMonth())

    expect(cascade.budget.map((step) => step.key)).toEqual([
      'bill',
      'expense',
      'saving',
      'debt',
    ])
    expect(cascade.budget.map((step) => step.remaining)).toEqual([3800, 2700, 2200, 1900])
    expect(cascade.finalBudget).toBe(1900)
  })

  it('descuenta la columna real de forma independiente', () => {
    const { cascade } = buildMonthlySummary(buildFixtureMonth())

    expect(cascade.actual.map((step) => step.remaining)).toEqual([3750, 3500, 3100, 2800])
    expect(cascade.finalActual).toBe(2800)
  })

  it('parte del ingreso y resta cada total exactamente una vez', () => {
    const totals = buildMonthlyTotals(buildFixtureMonth())
    const cascade = buildMonthlyCascade(totals)

    expect(cascade.budget[0]).toEqual({
      key: 'bill',
      label: 'Facturas',
      total: 1200,
      remaining: 3800,
    })
    expect(cascade.actual[3]).toEqual({
      key: 'debt',
      label: 'Deuda',
      total: 300,
      remaining: 2800,
    })
  })
})

describe('consolidado anual (Plantilla Anual)', () => {
  const months: MonthlyData[] = [
    buildFixtureMonth(),
    ...Array.from({ length: 11 }, () => createEmptyMonthlyData()),
  ]

  it('calcula los 4 KPIs superiores del año', () => {
    const { kpis } = buildAnnualSummary(months)

    // B5: ingreso real anual
    expect(kpis.totalIncome).toBe(5000)
    // F5: facturas reales + gastos reales (H30 + L30)
    expect(kpis.totalExpenses).toBe(1500)
    // J5: ingreso real - (facturas + gastos) (P30)
    expect(kpis.remaining).toBe(3500)
    // N5: ahorros reales (D45)
    expect(kpis.totalSavings).toBe(400)
  })

  it('genera las 4 series mensuales para las gráficas anuales', () => {
    const { series } = buildAnnualSummary(months)

    expect(series.income).toHaveLength(12)
    expect(series.billsAndExpenses).toHaveLength(12)
    expect(series.remaining).toHaveLength(12)
    expect(series.savings).toHaveLength(12)

    expect(series.income[0]).toBe(5000)
    expect(series.billsAndExpenses[0]).toBe(1500)
    expect(series.remaining[0]).toBe(3500)
    expect(series.savings[0]).toBe(400)
    // Meses sin inicializar quedan en cero
    expect(series.income[11]).toBe(0)
  })

  it('construye las 6 tablas comparativas con 12 filas y total anual', () => {
    const { tables } = buildAnnualSummary(months)

    for (const table of Object.values(tables)) {
      expect(table.rows).toHaveLength(12)
      expect(table.rows[0]!.monthName).toBe(MONTH_NAMES_ES[0])
      expect(table.rows[11]!.monthName).toBe(MONTH_NAMES_ES[11])
    }

    expect(tables.income.total).toEqual({ budget: 5000, actual: 5000 })
    expect(tables.bills.total).toEqual({ budget: 1200, actual: 1250 })
    expect(tables.expenses.total).toEqual({ budget: 1100, actual: 250 })
    expect(tables.savings.total).toEqual({ budget: 500, actual: 400 })
    expect(tables.debts.total).toEqual({ budget: 300, actual: 300 })
  })

  it('la tabla de cantidad restante usa ingreso - facturas - gastos (O18 / P18)', () => {
    const { tables } = buildAnnualSummary(months)
    const january = tables.remaining.rows[0]!

    expect(january.budget).toBe(2700) // 5000 - 1200 - 1100
    expect(january.actual).toBe(3500) // 5000 - 1250 - 250
    expect(tables.remaining.total).toEqual({ budget: 2700, actual: 3500 })
  })

  it('acepta años parciales (meses futuros sin inicializar)', () => {
    const { kpis } = buildAnnualSummary([buildFixtureMonth()])
    expect(kpis.totalIncome).toBe(5000)
    expect(kpis.totalExpenses).toBe(1500)
  })

  it('rechaza más de 12 meses', () => {
    const thirteen = Array.from({ length: 13 }, () => createEmptyMonthlyData())
    expect(() => buildAnnualSummary(thirteen)).toThrow()
  })
})

describe('calculadora de interés compuesto (hoja del Excel)', () => {
  it('reproduce los valores del mes 1 y del mes 12 con retiro', () => {
    const projection = buildCompoundProjection({
      initialCapital: 5000,
      monthlyRate: 0.06,
      months: 24,
      withdrawals: { 12: 1000 },
    })

    const first = projection.rows[0]!
    expect(first.capital).toBe(5000)
    expect(first.gain).toBeCloseTo(300, 6)
    expect(first.newCapital).toBeCloseTo(5300, 6)
    expect(first.totalCapital).toBeCloseTo(5300, 6)

    const month12 = projection.rows[11]!
    expect(month12.capital).toBeCloseTo(9491.492792, 5)
    expect(month12.gain).toBeCloseTo(569.4895675, 5)
    expect(month12.newCapital).toBeCloseTo(10060.982359, 4)
    expect(month12.withdrawal).toBe(1000)
    expect(month12.totalCapital).toBeCloseTo(9060.982359, 4)

    // El capital del mes siguiente arranca con el total del mes anterior
    expect(projection.rows[12]!.capital).toBeCloseTo(9060.982359, 4)
  })

  it('reproduce el capital final del mes 24 del Excel', () => {
    const projection = buildCompoundProjection({
      initialCapital: 5000,
      monthlyRate: 0.06,
      months: 24,
      withdrawals: { 12: 1000 },
    })

    expect(projection.rows[23]!.newCapital).toBeCloseTo(18232.47673, 4)
    expect(projection.finalCapital).toBeCloseTo(18232.47673, 4)
  })

  it('totaliza aportes, retiros y rendimientos', () => {
    const projection = buildCompoundProjection({
      initialCapital: 5000,
      monthlyRate: 0.06,
      months: 12,
      monthlyContribution: 100,
      withdrawals: { 12: 1000 },
    })

    expect(projection.totalContributed).toBe(6200) // 5000 + 100 * 12
    expect(projection.totalWithdrawn).toBe(1000)
    expect(projection.totalGains).toBeCloseTo(
      projection.rows.reduce((total, row) => total + row.gain, 0),
      6,
    )
    expect(projection.finalCapital).toBeCloseTo(projection.rows[11]!.totalCapital, 6)
  })

  it('sin meses devuelve únicamente el capital inicial', () => {
    const projection = buildCompoundProjection({
      initialCapital: 1500,
      monthlyRate: 0.05,
      months: 0,
    })

    expect(projection.rows).toHaveLength(0)
    expect(projection.finalCapital).toBe(1500)
    expect(projection.totalContributed).toBe(1500)
    expect(projection.totalGains).toBe(0)
  })

  it('valida los parámetros de entrada', () => {
    expect(() =>
      buildCompoundProjection({ initialCapital: 1000, monthlyRate: 0.05, months: 2.5 }),
    ).toThrow()
    expect(() =>
      buildCompoundProjection({ initialCapital: 1000, monthlyRate: 0.05, months: -1 }),
    ).toThrow()
    expect(() =>
      buildCompoundProjection({ initialCapital: Number.NaN, monthlyRate: 0.05, months: 1 }),
    ).toThrow()
  })
})
