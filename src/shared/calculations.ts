/**
 * Motor de cálculos financieros — funciones puras.
 *
 * Reproduce EXACTAMENTE las fórmulas de `PRESUPUESTO.xlsx` documentadas en
 * AGENTS.md §2:
 *  - Totales de los 5 bloques mensuales.
 *  - Gasto real por categoría derivado de las transacciones (SUMIF).
 *  - Cascada de "Restante" (Ingreso → Facturas → Gastos → Ahorros → Deuda).
 *  - Consolidado de la `Plantilla Anual` (4 KPIs, 4 series, 6 tablas).
 *  - Calculadora de interés compuesto mes a mes.
 *
 * Todas las funciones son deterministas y no acceden a base de datos ni a red.
 */

import type {
  AnnualSummary,
  AnnualTable,
  AnnualTableRow,
  BillRow,
  CascadeStep,
  CompoundParams,
  CompoundProjection,
  CompoundRow,
  DebtRow,
  ExpenseCategoryRow,
  ExpenseCategoryTotal,
  ExpenseSectionTotal,
  ExpenseTransaction,
  IncomeRow,
  MonthlyCascade,
  MonthlyData,
  MonthlySummary,
  MonthlyTotals,
  SavingRow,
  SectionTotal,
} from './types'

/** Precisión monetaria por defecto (2 decimales). */
export const MONEY_PRECISION = 2

/** Nombres de meses en español (1 = Enero). */
export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

/** Nombres cortos de meses (encabezados de pestañas). */
export const MONTH_SHORT_NAMES_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

/**
 * Redondea un monto a la precisión indicada evitando el sesgo hacia +∞ en
 * valores negativos (Math.round(-0.5) === -0).
 */
export function roundMoney(value: number, precision: number = MONEY_PRECISION): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** precision
  const sign = value < 0 ? -1 : 1
  return (sign * Math.round(Math.abs(value) * factor + Number.EPSILON * factor)) / factor
}

/** Suma montos y redondea el resultado al centavo. */
export function sumMoney(values: readonly number[]): number {
  const total = values.reduce(
    (acc, value) => acc + (Number.isFinite(value) ? value : 0),
    0,
  )
  return roundMoney(total)
}

/** Datos de un mes sin ninguna fila (mes aún no inicializado). */
export function createEmptyMonthlyData(): MonthlyData {
  return {
    incomes: [],
    bills: [],
    expenseCategories: [],
    transactions: [],
    savings: [],
    debts: [],
  }
}

// ---------------------------------------------------------------------------
// Totales mensuales por bloque
// ---------------------------------------------------------------------------

/** Bloque 1 — Total Esperado vs. Real de ingresos. */
export function totalIncomes(rows: readonly IncomeRow[]): SectionTotal {
  return {
    budget: sumMoney(rows.map((row) => row.expectedAmount)),
    actual: sumMoney(rows.map((row) => row.actualAmount)),
  }
}

/** Bloque 2 — Total Presupuesto vs. Real de facturas. */
export function totalBills(rows: readonly BillRow[]): SectionTotal {
  return {
    budget: sumMoney(rows.map((row) => row.budgetAmount)),
    actual: sumMoney(rows.map((row) => row.actualAmount)),
  }
}

/** Bloque 4 — Total Proyección vs. Real de ahorros. */
export function totalSavings(rows: readonly SavingRow[]): SectionTotal {
  return {
    budget: sumMoney(rows.map((row) => row.projectedAmount)),
    actual: sumMoney(rows.map((row) => row.actualAmount)),
  }
}

/** Bloque 5 — Total Esperado vs. Real de deudas. */
export function totalDebts(rows: readonly DebtRow[]): SectionTotal {
  return {
    budget: sumMoney(rows.map((row) => row.expectedAmount)),
    actual: sumMoney(rows.map((row) => row.actualAmount)),
  }
}

/**
 * Agrupa las transacciones por categoría (equivalente al SUMIF del Excel:
 * `SUMIF($B40:$B840, categoría, $D40:$D840)`).
 */
export function sumTransactionsByCategory(
  transactions: readonly ExpenseTransaction[],
): Map<number, number> {
  const totals = new Map<number, number>()
  for (const transaction of transactions) {
    if (!Number.isFinite(transaction.amount)) continue
    totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
    )
  }
  return totals
}

/**
 * Bloque 3 — Total Presupuesto vs. Real de gastos variables.
 *
 * El valor real de cada categoría se calcula SIEMPRE a partir de las
 * transacciones (`expense_transactions`); nunca se recibe como entrada directa.
 */
export function totalExpenses(
  categories: readonly ExpenseCategoryRow[],
  transactions: readonly ExpenseTransaction[],
): ExpenseSectionTotal {
  const byCategoryMap = sumTransactionsByCategory(transactions)

  const byCategory: ExpenseCategoryTotal[] = categories.map((category) => ({
    categoryId: category.id,
    name: category.name,
    budget: roundMoney(category.budgetAmount),
    actual: roundMoney(byCategoryMap.get(category.id) ?? 0),
  }))

  return {
    budget: sumMoney(byCategory.map((category) => category.budget)),
    actual: sumMoney(byCategory.map((category) => category.actual)),
    byCategory,
  }
}

/** Totales completos de los 5 bloques de un mes. */
export function buildMonthlyTotals(data: MonthlyData): MonthlyTotals {
  return {
    income: totalIncomes(data.incomes),
    bills: totalBills(data.bills),
    expenses: totalExpenses(data.expenseCategories, data.transactions),
    savings: totalSavings(data.savings),
    debts: totalDebts(data.debts),
  }
}

// ---------------------------------------------------------------------------
// Cascada de "Restante" (AGENTS.md §2.1.B)
// ---------------------------------------------------------------------------

const CASCADE_LABELS: Record<CascadeStep['key'], string> = {
  bill: 'Facturas',
  expense: 'Gastos',
  saving: 'Ahorros',
  debt: 'Deuda',
}

function buildCascadeSteps(
  income: number,
  totals: Array<{ key: CascadeStep['key']; total: number }>,
): { steps: CascadeStep[]; final: number } {
  let remaining = income
  const steps: CascadeStep[] = totals.map(({ key, total }) => {
    remaining = roundMoney(remaining - total)
    return { key, label: CASCADE_LABELS[key], total: roundMoney(total), remaining }
  })
  return { steps, final: remaining }
}

/**
 * Cascada del dinero del mes:
 * `Ingreso - Facturas - Gastos - Ahorros - Deuda = Restante final`.
 *
 * Se calcula en paralelo para la columna presupuesto/esperado y para la real.
 */
export function buildMonthlyCascade(totals: MonthlyTotals): MonthlyCascade {
  const budget = buildCascadeSteps(totals.income.budget, [
    { key: 'bill', total: totals.bills.budget },
    { key: 'expense', total: totals.expenses.budget },
    { key: 'saving', total: totals.savings.budget },
    { key: 'debt', total: totals.debts.budget },
  ])
  const actual = buildCascadeSteps(totals.income.actual, [
    { key: 'bill', total: totals.bills.actual },
    { key: 'expense', total: totals.expenses.actual },
    { key: 'saving', total: totals.savings.actual },
    { key: 'debt', total: totals.debts.actual },
  ])

  return {
    budget: budget.steps,
    actual: actual.steps,
    finalBudget: budget.final,
    finalActual: actual.final,
  }
}

/** Totales + cascada de un mes. */
export function buildMonthlySummary(data: MonthlyData): MonthlySummary {
  const totals = buildMonthlyTotals(data)
  return { totals, cascade: buildMonthlyCascade(totals) }
}

// ---------------------------------------------------------------------------
// Consolidado anual (`Plantilla Anual` + hoja `Formulas`)
// ---------------------------------------------------------------------------

function buildAnnualTable(
  key: AnnualTable['key'],
  label: string,
  budgetLabel: string,
  actualLabel: string,
  rows: readonly AnnualTableRow[],
): AnnualTable {
  return {
    key,
    label,
    budgetLabel,
    actualLabel,
    rows: [...rows],
    total: {
      budget: sumMoney(rows.map((row) => row.budget)),
      actual: sumMoney(rows.map((row) => row.actual)),
    },
  }
}

/**
 * Construye el consolidado anual a partir de los 12 meses del año.
 *
 * `months[0]` = Enero … `months[11]` = Diciembre. Si se reciben menos meses
 * (año en curso), los meses faltantes se tratan como vacíos, igual que las
 * celdas sin llenar del Excel.
 */
export function buildAnnualSummary(months: readonly MonthlyData[]): AnnualSummary {
  if (months.length > 12) {
    throw new Error('El año no puede tener más de 12 meses')
  }

  const monthTotals: MonthlyTotals[] = Array.from({ length: 12 }, (_, index) => {
    const month = months[index]
    return buildMonthlyTotals(month ?? createEmptyMonthlyData())
  })

  const rowsFor = (
    pick: (totals: MonthlyTotals) => SectionTotal,
  ): AnnualTableRow[] =>
    monthTotals.map((totals, index) => {
      const { budget, actual } = pick(totals)
      return {
        month: index + 1,
        monthName: MONTH_NAMES_ES[index]!,
        budget,
        actual,
      }
    })

  const incomeRows = rowsFor((totals) => totals.income)
  const billRows = rowsFor((totals) => totals.bills)
  const expenseRows = rowsFor((totals) => totals.expenses)
  const remainingRows = monthTotals.map((totals, index) => ({
    month: index + 1,
    monthName: MONTH_NAMES_ES[index]!,
    // Excel: O = C - G - K (esperado - facturas - gastos) / P = D - H - L.
    budget: roundMoney(totals.income.budget - totals.bills.budget - totals.expenses.budget),
    actual: roundMoney(totals.income.actual - totals.bills.actual - totals.expenses.actual),
  }))
  const savingRows = rowsFor((totals) => totals.savings)
  const debtRows = rowsFor((totals) => totals.debts)

  const series: AnnualSummary['series'] = {
    income: incomeRows.map((row) => row.actual),
    billsAndExpenses: monthTotals.map((totals) =>
      roundMoney(totals.bills.actual + totals.expenses.actual),
    ),
    remaining: remainingRows.map((row) => row.actual),
    savings: savingRows.map((row) => row.actual),
  }

  const totalIncome = sumMoney(series.income)
  const totalExpenses = sumMoney(series.billsAndExpenses)
  const totalSavings = sumMoney(series.savings)

  return {
    kpis: {
      totalIncome,
      totalExpenses,
      remaining: roundMoney(totalIncome - totalExpenses),
      totalSavings,
    },
    series,
    tables: {
      income: buildAnnualTable('income', 'INGRESO', 'Esperado', 'Real', incomeRows),
      bills: buildAnnualTable('bills', 'PAGOS', 'Presupuesto', 'Real', billRows),
      expenses: buildAnnualTable('expenses', 'GASTOS', 'Presupuesto', 'Real', expenseRows),
      remaining: buildAnnualTable(
        'remaining',
        'CANTIDAD RESTANTE',
        'Presupuesto',
        'Real',
        remainingRows,
      ),
      savings: buildAnnualTable('savings', 'AHORROS', 'Proyección', 'Real', savingRows),
      debts: buildAnnualTable('debts', 'DEUDA', 'Esperado', 'Real', debtRows),
    },
  }
}

// ---------------------------------------------------------------------------
// Calculadora de interés compuesto
// ---------------------------------------------------------------------------

/**
 * Proyección de interés compuesto mes a mes.
 *
 * Fórmulas (AGENTS.md §2.3.B):
 *  - capital(m)      = totalCapital(m - 1) (o capital inicial en m = 1)
 *  - rendimiento(m)  = capital(m) * tasaMensual
 *  - nuevoCapital(m) = capital(m) + rendimiento(m) + aportación(m)
 *  - totalCapital(m) = nuevoCapital(m) - retiro(m)
 *
 * No se redondea dentro de la iteración para preservar la precisión del
 * interés compuesto (igual que el Excel); el redondeo es responsabilidad de
 * la capa de presentación.
 */
export function buildCompoundProjection(params: CompoundParams): CompoundProjection {
  const {
    initialCapital,
    monthlyRate,
    months,
    monthlyContribution = 0,
    withdrawals = {},
  } = params

  if (!Number.isFinite(months) || months < 0 || !Number.isInteger(months)) {
    throw new Error('El plazo en meses debe ser un entero mayor o igual a 0')
  }
  if (!Number.isFinite(initialCapital)) {
    throw new Error('El capital inicial debe ser un número finito')
  }
  if (!Number.isFinite(monthlyRate)) {
    throw new Error('La tasa mensual debe ser un número finito')
  }

  const rows: CompoundRow[] = []
  let capital = initialCapital

  for (let month = 1; month <= months; month += 1) {
    const gain = capital * monthlyRate
    const contribution = monthlyContribution
    const newCapital = capital + gain + contribution
    const withdrawal = withdrawals[month] ?? 0
    const totalCapital = newCapital - withdrawal

    rows.push({
      month,
      capital,
      gain,
      contribution,
      newCapital,
      withdrawal,
      totalCapital,
    })

    capital = totalCapital
  }

  const totalContributed = initialCapital + monthlyContribution * months
  const totalWithdrawn = rows.reduce((total, row) => total + row.withdrawal, 0)
  const totalGains = rows.reduce((total, row) => total + row.gain, 0)

  return {
    rows,
    finalCapital: rows.length > 0 ? rows[rows.length - 1]!.totalCapital : initialCapital,
    totalContributed,
    totalWithdrawn,
    totalGains,
  }
}
