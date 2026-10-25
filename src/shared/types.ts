/**
 * Contratos de datos del dominio financiero (AGENTS.md §4).
 *
 * Los nombres de campos reflejan las columnas de la base de datos SQLite para
 * que el motor de cálculos (`calculations.ts`) pueda operar indistintamente
 * sobre datos recién leídos o sobre fixtures de prueba.
 */

/** Secciones presupuestarias del mes (los 5 bloques del Excel). */
export type SectionKey = 'income' | 'bill' | 'expense' | 'saving' | 'debt'

/** Bloque 1 — INGRESO: fuentes de ingreso del mes. */
export interface IncomeRow {
  id: number
  name: string
  /** Fecha de cobro en formato ISO `YYYY-MM-DD` (opcional, como en el Excel). */
  date: string | null
  /** Columna `Esperado`. */
  expectedAmount: number
  /** Columna `Real`. */
  actualAmount: number
}

/** Bloque 2 — FACTURAS: pagos fijos o recurrentes del mes. */
export interface BillRow {
  id: number
  name: string
  /** Fecha de pago en formato ISO `YYYY-MM-DD`. */
  dueDate: string | null
  /** Checkbox "Pagado" del Excel. */
  isPaid: boolean
  /** Columna `Presupuesto`. */
  budgetAmount: number
  /** Columna `Real`. */
  actualAmount: number
}

/** Bloque 3 — GASTOS: categorías variables del mes (solo presupuesto). */
export interface ExpenseCategoryRow {
  id: number
  name: string
  /** Columna `Presupuesto`. El valor real se deriva de las transacciones. */
  budgetAmount: number
}

/** Transacción del Registro de Gastos (equivalente a las filas 40–840 del Excel). */
export interface ExpenseTransaction {
  id: number
  /** FK lógica hacia `ExpenseCategoryRow.id`. */
  categoryId: number
  amount: number
  /** Fecha del gasto en formato ISO `YYYY-MM-DD`. */
  date: string | null
  notes: string
}

/** Bloque 4 — AHORROS: metas de ahorro del mes. */
export interface SavingRow {
  id: number
  name: string
  /** Columna `Proyección`. */
  projectedAmount: number
  /** Columna `Real`. */
  actualAmount: number
}

/** Bloque 5 — DEUDA: pagos de deuda del mes. */
export interface DebtRow {
  id: number
  name: string
  /** Columna `Esperado`. */
  expectedAmount: number
  /** Columna `Real`. */
  actualAmount: number
}

/** Estado completo de un mes (equivalente a una hoja `Ene`..`Dic`). */
export interface MonthlyData {
  incomes: IncomeRow[]
  bills: BillRow[]
  expenseCategories: ExpenseCategoryRow[]
  transactions: ExpenseTransaction[]
  savings: SavingRow[]
  debts: DebtRow[]
}

/** Par de valores presupuesto/esperado vs. real de un bloque. */
export interface SectionTotal {
  /** Presupuesto, proyección o esperado según el bloque. */
  budget: number
  /** Valor real ejecutado. */
  actual: number
}

/** Totales de una categoría de gasto variable. */
export interface ExpenseCategoryTotal {
  categoryId: number
  name: string
  budget: number
  /** Derivado exclusivamente de `ExpenseTransaction` (regla de oro). */
  actual: number
}

/** Totales del bloque de gastos variables, con desglose por categoría. */
export interface ExpenseSectionTotal extends SectionTotal {
  byCategory: ExpenseCategoryTotal[]
}

/** Totales de los 5 bloques del mes. */
export interface MonthlyTotals {
  income: SectionTotal
  bills: SectionTotal
  expenses: ExpenseSectionTotal
  savings: SectionTotal
  debts: SectionTotal
}

/** Paso de la cascada de "Restante" (AGENTS.md §2.1.B). */
export interface CascadeStep {
  key: Exclude<SectionKey, 'income'>
  label: string
  /** Total del bloque restado en este paso. */
  total: number
  /** Dinero disponible después de restar este bloque. */
  remaining: number
}

/** Cascada de "Restante" para la columna presupuesto y la columna real. */
export interface MonthlyCascade {
  budget: CascadeStep[]
  actual: CascadeStep[]
  /** Restante final por asignar (después de deudas). */
  finalBudget: number
  finalActual: number
}

/** Resultado completo del cálculo de un mes. */
export interface MonthlySummary {
  totals: MonthlyTotals
  cascade: MonthlyCascade
}

/** Fila de una tabla comparativa anual (un mes). */
export interface AnnualTableRow {
  /** 1 = Enero … 12 = Diciembre. */
  month: number
  monthName: string
  budget: number
  actual: number
}

/** Tabla comparativa anual de un bloque. */
export interface AnnualTable {
  key: 'income' | 'bills' | 'expenses' | 'remaining' | 'savings' | 'debts'
  label: string
  budgetLabel: string
  actualLabel: string
  /** 12 filas, de Enero a Diciembre. */
  rows: AnnualTableRow[]
  total: SectionTotal
}

/** Los 4 KPIs superiores de la `Plantilla Anual`. */
export interface AnnualKpis {
  /** Suma de ingresos reales del año. */
  totalIncome: number
  /** Facturas reales + gastos variables reales del año. */
  totalExpenses: number
  /** Ingreso real - gastos totales. */
  remaining: number
  /** Suma de ahorros reales del año. */
  totalSavings: number
}

/** Series mensuales (12 valores) para las 4 gráficas anuales. */
export interface AnnualSeries {
  income: number[]
  billsAndExpenses: number[]
  remaining: number[]
  savings: number[]
}

/** Consolidado anual completo (equivalente a `Plantilla Anual`). */
export interface AnnualSummary {
  kpis: AnnualKpis
  series: AnnualSeries
  tables: {
    income: AnnualTable
    bills: AnnualTable
    expenses: AnnualTable
    remaining: AnnualTable
    savings: AnnualTable
    debts: AnnualTable
  }
}

/** Parámetros de la calculadora de interés compuesto. */
export interface CompoundParams {
  initialCapital: number
  /** Tasa mensual expresada como fracción (0.06 = 6%). */
  monthlyRate: number
  /** Plazo total en meses. */
  months: number
  /** Aportación mensual opcional (0 si no aplica). */
  monthlyContribution?: number
  /** Retiros por número de mes, ej. `{ 12: 1000 }`. */
  withdrawals?: Record<number, number>
}

/** Fila mensual de la proyección de interés compuesto. */
export interface CompoundRow {
  month: number
  /** Capital al inicio del mes. */
  capital: number
  /** Rendimiento del mes (`capital * monthlyRate`). */
  gain: number
  /** Aportación del mes. */
  contribution: number
  /** Capital + rendimiento + aportación. */
  newCapital: number
  /** Retiro aplicado en el mes. */
  withdrawal: number
  /** Nuevo capital - retiro (capital inicial del mes siguiente). */
  totalCapital: number
}

/** Proyección completa de interés compuesto. */
export interface CompoundProjection {
  rows: CompoundRow[]
  finalCapital: number
  /** Capital inicial + todas las aportaciones. */
  totalContributed: number
  totalWithdrawn: number
  totalGains: number
}
