/**
 * Servicio de meses: carga de datos, payload completo y inicialización
 * (desde catálogo maestro, copiando el mes anterior o en blanco).
 */

import { and, asc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { MONTH_NAMES_ES, buildMonthlySummary, roundMoney } from '../shared/calculations'
import { buildMonthDate, shiftMonthDate } from '../shared/dates'
import {
  catalogItems,
  expenseTransactions,
  monthlyBills,
  monthlyDebts,
  monthlyExpenseCategories,
  monthlyIncomes,
  monthlyPeriods,
  monthlySavings,
  type ExpenseTransactionRow,
  type MonthlyBillRow,
  type MonthlyDebtRow,
  type MonthlyExpenseCategoryRow,
  type MonthlyIncomeRow,
  type MonthlyPeriodRow,
  type MonthlySavingRow,
} from '../shared/schema'
import type { MonthlyData } from '../shared/types'
import type { AppDatabase } from './db'
import { getDebtAccounts, getSettledDebtIds } from './debt-service'

/** Filas completas de un mes (incluye IDs internos y orden). */
export interface LoadedMonthlyData {
  incomes: MonthlyIncomeRow[]
  bills: MonthlyBillRow[]
  expenseCategories: MonthlyExpenseCategoryRow[]
  savings: MonthlySavingRow[]
  debts: MonthlyDebtRow[]
  transactions: Array<ExpenseTransactionRow & { categoryId: number }>
}

/** Carga los 6 conjuntos de datos de un mes desde SQLite. */
export function loadMonthlyData(db: AppDatabase, periodId: number): LoadedMonthlyData {
  const transactions = db
    .select()
    .from(expenseTransactions)
    .where(eq(expenseTransactions.periodId, periodId))
    .orderBy(asc(expenseTransactions.id))
    .all()

  return {
    incomes: db
      .select()
      .from(monthlyIncomes)
      .where(eq(monthlyIncomes.periodId, periodId))
      .orderBy(asc(monthlyIncomes.sortOrder), asc(monthlyIncomes.id))
      .all(),
    bills: db
      .select()
      .from(monthlyBills)
      .where(eq(monthlyBills.periodId, periodId))
      .orderBy(asc(monthlyBills.sortOrder), asc(monthlyBills.id))
      .all(),
    expenseCategories: db
      .select()
      .from(monthlyExpenseCategories)
      .where(eq(monthlyExpenseCategories.periodId, periodId))
      .orderBy(asc(monthlyExpenseCategories.sortOrder), asc(monthlyExpenseCategories.id))
      .all(),
    transactions: transactions.map((row) => ({ ...row, categoryId: row.expenseCategoryId })),
    savings: db
      .select()
      .from(monthlySavings)
      .where(eq(monthlySavings.periodId, periodId))
      .orderBy(asc(monthlySavings.sortOrder), asc(monthlySavings.id))
      .all(),
    debts: db
      .select()
      .from(monthlyDebts)
      .where(eq(monthlyDebts.periodId, periodId))
      .orderBy(asc(monthlyDebts.sortOrder), asc(monthlyDebts.id))
      .all(),
  }
}

/**
 * Payload completo que consume la vista mensual del frontend:
 * filas de los 5 bloques, transacciones, gasto real por categoría y resumen
 * (totales + cascada de Restante).
 */
export function buildMonthPayload(db: AppDatabase, period: MonthlyPeriodRow) {
  const data = loadMonthlyData(db, period.id)
  const summary = buildMonthlySummary(data)
  const actualByCategory = new Map(
    summary.totals.expenses.byCategory.map((category) => [category.categoryId, category.actual]),
  )

  const debtAccounts = getDebtAccounts(db)
  const debtAccountById = new Map(
    debtAccounts.map((account) => [account.catalogItemId, account]),
  )
  const debts = data.debts.map((row) => {
    const account = row.catalogItemId === null ? undefined : debtAccountById.get(row.catalogItemId)
    return {
      ...row,
      totalAmount: account?.totalAmount ?? null,
      paidAmount: account?.paidAmount ?? roundMoney(row.actualAmount),
      remainingAmount: account?.remainingAmount ?? null,
      isSettled: account?.isSettled ?? false,
    }
  })

  return {
    year: period.year,
    month: period.month,
    monthName: MONTH_NAMES_ES[period.month - 1] ?? '',
    period: { id: period.id, isInitialized: period.isInitialized },
    incomes: data.incomes,
    bills: data.bills,
    expenseCategories: data.expenseCategories.map((category) => ({
      ...category,
      actualAmount: actualByCategory.get(category.id) ?? 0,
    })),
    savings: data.savings,
    debts,
    debtAccounts,
    transactions: data.transactions,
    summary,
  }
}

export type MonthPayload = ReturnType<typeof buildMonthPayload>

/** Origen de la inicialización de un mes. */
export type InitSource = 'catalog' | 'previous' | 'blank'

function isEmptyMonth(data: MonthlyData): boolean {
  return (
    data.incomes.length === 0 &&
    data.bills.length === 0 &&
    data.expenseCategories.length === 0 &&
    data.savings.length === 0 &&
    data.debts.length === 0 &&
    data.transactions.length === 0
  )
}

function fromCatalog(db: AppDatabase, period: MonthlyPeriodRow): void {
  const items = db
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.isActive, true))
    .orderBy(asc(catalogItems.section), asc(catalogItems.sortOrder), asc(catalogItems.id))
    .all()

  const bySection = (section: string) => items.filter((item) => item.section === section)
  const dateFromDay = (day: number | null): string | null =>
    day === null ? null : buildMonthDate(period.year, period.month, day)
  const settledDebtIds = getSettledDebtIds(db)

  const incomes = bySection('income').map((item, index) => ({
    periodId: period.id,
    catalogItemId: item.id,
    name: item.name,
    date: dateFromDay(item.defaultDayOfMonth),
    expectedAmount: item.defaultAmount,
    actualAmount: 0,
    sortOrder: index,
  }))

  const bills = bySection('bill').map((item, index) => ({
    periodId: period.id,
    catalogItemId: item.id,
    name: item.name,
    dueDate: dateFromDay(item.defaultDayOfMonth),
    isPaid: false,
    budgetAmount: item.defaultAmount,
    actualAmount: 0,
    sortOrder: index,
  }))

  const expenseCategories = bySection('expense').map((item, index) => ({
    periodId: period.id,
    catalogItemId: item.id,
    name: item.name,
    budgetAmount: item.defaultAmount,
    sortOrder: index,
  }))

  const savings = bySection('saving').map((item, index) => ({
    periodId: period.id,
    catalogItemId: item.id,
    name: item.name,
    projectedAmount: item.defaultAmount,
    actualAmount: 0,
    sortOrder: index,
  }))

  const debts = bySection('debt')
    .filter((item) => !settledDebtIds.has(item.id))
    .map((item, index) => ({
      periodId: period.id,
      catalogItemId: item.id,
      name: item.name,
      expectedAmount: item.defaultAmount,
      actualAmount: 0,
      sortOrder: index,
    }))

  db.transaction((tx) => {
    if (incomes.length > 0) tx.insert(monthlyIncomes).values(incomes).run()
    if (bills.length > 0) tx.insert(monthlyBills).values(bills).run()
    if (expenseCategories.length > 0) {
      tx.insert(monthlyExpenseCategories).values(expenseCategories).run()
    }
    if (savings.length > 0) tx.insert(monthlySavings).values(savings).run()
    if (debts.length > 0) tx.insert(monthlyDebts).values(debts).run()
  })
}

function fromPreviousMonth(db: AppDatabase, period: MonthlyPeriodRow): void {
  const prevYear = period.month === 1 ? period.year - 1 : period.year
  const prevMonth = period.month === 1 ? 12 : period.month - 1

  const previous = db
    .select()
    .from(monthlyPeriods)
    .where(and(eq(monthlyPeriods.year, prevYear), eq(monthlyPeriods.month, prevMonth)))
    .get()

  if (!previous) {
    throw new HTTPException(400, {
      message: 'No hay un mes anterior para copiar. Usa el catálogo maestro o empieza en blanco.',
    })
  }

  const data = loadMonthlyData(db, previous.id)
  if (isEmptyMonth(data)) {
    throw new HTTPException(400, {
      message: 'El mes anterior está vacío. Usa el catálogo maestro o empieza en blanco.',
    })
  }

  // Igual que `EDATE` del Excel: desplaza un mes y ajusta el día si hace falta.
  const shiftDate = (date: string | null): string | null =>
    date === null ? null : shiftMonthDate(date, 1)
  const settledDebtIds = getSettledDebtIds(db)

  db.transaction((tx) => {
    const incomes = data.incomes.map((row, index) => ({
      periodId: period.id,
      catalogItemId: row.catalogItemId,
      name: row.name,
      date: shiftDate(row.date),
      expectedAmount: row.expectedAmount,
      actualAmount: 0,
      sortOrder: row.sortOrder || index,
    }))
    const bills = data.bills.map((row, index) => ({
      periodId: period.id,
      catalogItemId: row.catalogItemId,
      name: row.name,
      dueDate: shiftDate(row.dueDate),
      isPaid: false,
      budgetAmount: row.budgetAmount,
      actualAmount: 0,
      sortOrder: row.sortOrder || index,
    }))
    const expenseCategories = data.expenseCategories.map((row, index) => ({
      periodId: period.id,
      catalogItemId: row.catalogItemId,
      name: row.name,
      budgetAmount: row.budgetAmount,
      sortOrder: row.sortOrder || index,
    }))
    const savings = data.savings.map((row, index) => ({
      periodId: period.id,
      catalogItemId: row.catalogItemId,
      name: row.name,
      projectedAmount: row.projectedAmount,
      actualAmount: 0,
      sortOrder: row.sortOrder || index,
    }))
    const debts = data.debts
      .filter((row) => row.catalogItemId === null || !settledDebtIds.has(row.catalogItemId))
      .map((row, index) => ({
        periodId: period.id,
        catalogItemId: row.catalogItemId,
        name: row.name,
        expectedAmount: row.expectedAmount,
        actualAmount: 0,
        sortOrder: row.sortOrder || index,
      }))

    if (incomes.length > 0) tx.insert(monthlyIncomes).values(incomes).run()
    if (bills.length > 0) tx.insert(monthlyBills).values(bills).run()
    if (expenseCategories.length > 0) {
      tx.insert(monthlyExpenseCategories).values(expenseCategories).run()
    }
    if (savings.length > 0) tx.insert(monthlySavings).values(savings).run()
    if (debts.length > 0) tx.insert(monthlyDebts).values(debts).run()

    // Las transacciones NO se copian: cada mes empieza con su registro limpio.
  })
}

/**
 * Puebla un mes según el origen elegido y lo marca como inicializado.
 * El llamador debe verificar antes que el mes no esté ya inicializado.
 */
export function initializeMonth(
  db: AppDatabase,
  period: MonthlyPeriodRow,
  source: InitSource,
): void {
  if (source === 'catalog') fromCatalog(db, period)
  if (source === 'previous') fromPreviousMonth(db, period)

  db.update(monthlyPeriods)
    .set({ isInitialized: true })
    .where(eq(monthlyPeriods.id, period.id))
    .run()
}
