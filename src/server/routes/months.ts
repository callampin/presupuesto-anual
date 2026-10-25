/** Rutas mensuales: bloques, registro de gastos e inicialización (`/api/months`). */

import { Hono } from 'hono'
import { and, asc, eq, max } from 'drizzle-orm'
import {
  expenseTransactions,
  monthlyBills,
  monthlyDebts,
  monthlyExpenseCategories,
  monthlyIncomes,
  monthlySavings,
  catalogItems,
} from '../../shared/schema'
import {
  billCreateSchema,
  billUpdateSchema,
  debtCreateSchema,
  debtUpdateSchema,
  expenseCategoryCreateSchema,
  expenseCategoryUpdateSchema,
  incomeCreateSchema,
  incomeUpdateSchema,
  monthInitializeSchema,
  savingCreateSchema,
  savingUpdateSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
} from '../../shared/validation'
import type { AppDatabase } from '../db'
import { buildMonthPayload, initializeMonth } from '../month-service'
import {
  parseBody,
  parseIdParam,
  parseYearMonth,
  requirePeriod,
} from './helpers'

function hasKeys(value: object): boolean {
  return Object.keys(value).length > 0
}

/** Unifica `categoryId` (dominio) con `expenseCategoryId` (columna SQLite). */
function toTransactionResponse<T extends { expenseCategoryId: number }>(row: T) {
  return { ...row, categoryId: row.expenseCategoryId }
}

export function createMonthRoutes(db: AppDatabase) {
  const router = new Hono()

  router.get('/:year/:month', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    return c.json(buildMonthPayload(db, period))
  })

  router.post('/:year/:month/initialize', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const { source } = await parseBody(c, monthInitializeSchema)

    if (period.isInitialized) {
      return c.json(
        { error: 'El mes ya está inicializado. Edita sus filas o usa otro mes.' },
        409,
      )
    }

    initializeMonth(db, period, source)
    const refreshed = requirePeriod(db, year, month)
    return c.json(buildMonthPayload(db, refreshed), 201)
  })

  // -------------------------------------------------------------------------
  // Bloque 1 — Ingresos
  // -------------------------------------------------------------------------

  router.post('/:year/:month/incomes', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const input = await parseBody(c, incomeCreateSchema)

    const highest = db
      .select({ value: max(monthlyIncomes.sortOrder) })
      .from(monthlyIncomes)
      .where(eq(monthlyIncomes.periodId, period.id))
      .get()?.value

    const row = db
      .insert(monthlyIncomes)
      .values({
        periodId: period.id,
        name: input.name,
        date: input.date ?? null,
        expectedAmount: input.expectedAmount ?? 0,
        actualAmount: input.actualAmount ?? 0,
        sortOrder: (highest ?? -1) + 1,
      })
      .returning()
      .get()

    return c.json(row, 201)
  })

  router.put('/:year/:month/incomes/:id', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, incomeUpdateSchema)

    if (!hasKeys(input)) return c.json({ error: 'Nada que actualizar' }, 422)

    const existing = db
      .select()
      .from(monthlyIncomes)
      .where(and(eq(monthlyIncomes.id, id), eq(monthlyIncomes.periodId, period.id)))
      .get()
    if (!existing) return c.json({ error: 'Ingreso no encontrado' }, 404)

    const updated = db
      .update(monthlyIncomes)
      .set(input)
      .where(eq(monthlyIncomes.id, id))
      .returning()
      .get()
    return c.json(updated)
  })

  router.delete('/:year/:month/incomes/:id', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))

    const deleted = db
      .delete(monthlyIncomes)
      .where(and(eq(monthlyIncomes.id, id), eq(monthlyIncomes.periodId, period.id)))
      .returning()
      .get()

    if (!deleted) return c.json({ error: 'Ingreso no encontrado' }, 404)
    return c.json({ deleted: true, id })
  })

  // -------------------------------------------------------------------------
  // Bloque 2 — Facturas
  // -------------------------------------------------------------------------

  router.post('/:year/:month/bills', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const input = await parseBody(c, billCreateSchema)

    const highest = db
      .select({ value: max(monthlyBills.sortOrder) })
      .from(monthlyBills)
      .where(eq(monthlyBills.periodId, period.id))
      .get()?.value

    const row = db
      .insert(monthlyBills)
      .values({
        periodId: period.id,
        name: input.name,
        dueDate: input.dueDate ?? null,
        isPaid: input.isPaid ?? false,
        budgetAmount: input.budgetAmount ?? 0,
        actualAmount: input.actualAmount ?? 0,
        sortOrder: (highest ?? -1) + 1,
      })
      .returning()
      .get()

    return c.json(row, 201)
  })

  router.put('/:year/:month/bills/:id', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, billUpdateSchema)

    if (!hasKeys(input)) return c.json({ error: 'Nada que actualizar' }, 422)

    const existing = db
      .select()
      .from(monthlyBills)
      .where(and(eq(monthlyBills.id, id), eq(monthlyBills.periodId, period.id)))
      .get()
    if (!existing) return c.json({ error: 'Factura no encontrada' }, 404)

    const updated = db
      .update(monthlyBills)
      .set(input)
      .where(eq(monthlyBills.id, id))
      .returning()
      .get()
    return c.json(updated)
  })

  router.delete('/:year/:month/bills/:id', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))

    const deleted = db
      .delete(monthlyBills)
      .where(and(eq(monthlyBills.id, id), eq(monthlyBills.periodId, period.id)))
      .returning()
      .get()

    if (!deleted) return c.json({ error: 'Factura no encontrada' }, 404)
    return c.json({ deleted: true, id })
  })

  // -------------------------------------------------------------------------
  // Bloque 3 — Categorías de gasto variable
  // -------------------------------------------------------------------------

  router.post('/:year/:month/expense-categories', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const input = await parseBody(c, expenseCategoryCreateSchema)

    const highest = db
      .select({ value: max(monthlyExpenseCategories.sortOrder) })
      .from(monthlyExpenseCategories)
      .where(eq(monthlyExpenseCategories.periodId, period.id))
      .get()?.value

    const row = db
      .insert(monthlyExpenseCategories)
      .values({
        periodId: period.id,
        name: input.name,
        budgetAmount: input.budgetAmount ?? 0,
        sortOrder: (highest ?? -1) + 1,
      })
      .returning()
      .get()

    return c.json(row, 201)
  })

  router.put('/:year/:month/expense-categories/:id', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, expenseCategoryUpdateSchema)

    if (!hasKeys(input)) return c.json({ error: 'Nada que actualizar' }, 422)

    const existing = db
      .select()
      .from(monthlyExpenseCategories)
      .where(
        and(
          eq(monthlyExpenseCategories.id, id),
          eq(monthlyExpenseCategories.periodId, period.id),
        ),
      )
      .get()
    if (!existing) return c.json({ error: 'Categoría de gasto no encontrada' }, 404)

    const updated = db
      .update(monthlyExpenseCategories)
      .set(input)
      .where(eq(monthlyExpenseCategories.id, id))
      .returning()
      .get()
    return c.json(updated)
  })

  router.delete('/:year/:month/expense-categories/:id', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))

    const deleted = db
      .delete(monthlyExpenseCategories)
      .where(
        and(
          eq(monthlyExpenseCategories.id, id),
          eq(monthlyExpenseCategories.periodId, period.id),
        ),
      )
      .returning()
      .get()

    if (!deleted) return c.json({ error: 'Categoría de gasto no encontrada' }, 404)
    return c.json({ deleted: true, id })
  })

  // -------------------------------------------------------------------------
  // Bloque 4 — Ahorros
  // -------------------------------------------------------------------------

  router.post('/:year/:month/savings', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const input = await parseBody(c, savingCreateSchema)

    const highest = db
      .select({ value: max(monthlySavings.sortOrder) })
      .from(monthlySavings)
      .where(eq(monthlySavings.periodId, period.id))
      .get()?.value

    const row = db
      .insert(monthlySavings)
      .values({
        periodId: period.id,
        name: input.name,
        projectedAmount: input.projectedAmount ?? 0,
        actualAmount: input.actualAmount ?? 0,
        sortOrder: (highest ?? -1) + 1,
      })
      .returning()
      .get()

    return c.json(row, 201)
  })

  router.put('/:year/:month/savings/:id', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, savingUpdateSchema)

    if (!hasKeys(input)) return c.json({ error: 'Nada que actualizar' }, 422)

    const existing = db
      .select()
      .from(monthlySavings)
      .where(and(eq(monthlySavings.id, id), eq(monthlySavings.periodId, period.id)))
      .get()
    if (!existing) return c.json({ error: 'Ahorro no encontrado' }, 404)

    const updated = db
      .update(monthlySavings)
      .set(input)
      .where(eq(monthlySavings.id, id))
      .returning()
      .get()
    return c.json(updated)
  })

  router.delete('/:year/:month/savings/:id', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))

    const deleted = db
      .delete(monthlySavings)
      .where(and(eq(monthlySavings.id, id), eq(monthlySavings.periodId, period.id)))
      .returning()
      .get()

    if (!deleted) return c.json({ error: 'Ahorro no encontrado' }, 404)
    return c.json({ deleted: true, id })
  })

  // -------------------------------------------------------------------------
  // Bloque 5 — Deudas
  // -------------------------------------------------------------------------

  router.post('/:year/:month/debts', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const input = await parseBody(c, debtCreateSchema)

    if (input.catalogItemId !== undefined && input.catalogItemId !== null) {
      const catalogItem = db
        .select()
        .from(catalogItems)
        .where(
          and(
            eq(catalogItems.id, input.catalogItemId),
            eq(catalogItems.section, 'debt'),
          ),
        )
        .get()
      if (!catalogItem) {
        return c.json({ error: 'La deuda indicada no existe en el catálogo' }, 422)
      }
    }

    const highest = db
      .select({ value: max(monthlyDebts.sortOrder) })
      .from(monthlyDebts)
      .where(eq(monthlyDebts.periodId, period.id))
      .get()?.value

    const row = db
      .insert(monthlyDebts)
      .values({
        periodId: period.id,
        catalogItemId: input.catalogItemId ?? null,
        name: input.name,
        expectedAmount: input.expectedAmount ?? 0,
        actualAmount: input.actualAmount ?? 0,
        sortOrder: (highest ?? -1) + 1,
      })
      .returning()
      .get()

    return c.json(row, 201)
  })

  router.put('/:year/:month/debts/:id', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, debtUpdateSchema)

    if (!hasKeys(input)) return c.json({ error: 'Nada que actualizar' }, 422)

    const existing = db
      .select()
      .from(monthlyDebts)
      .where(and(eq(monthlyDebts.id, id), eq(monthlyDebts.periodId, period.id)))
      .get()
    if (!existing) return c.json({ error: 'Deuda no encontrada' }, 404)

    const updated = db
      .update(monthlyDebts)
      .set(input)
      .where(eq(monthlyDebts.id, id))
      .returning()
      .get()
    return c.json(updated)
  })

  router.delete('/:year/:month/debts/:id', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))

    const deleted = db
      .delete(monthlyDebts)
      .where(and(eq(monthlyDebts.id, id), eq(monthlyDebts.periodId, period.id)))
      .returning()
      .get()

    if (!deleted) return c.json({ error: 'Deuda no encontrada' }, 404)
    return c.json({ deleted: true, id })
  })

  // -------------------------------------------------------------------------
  // Registro de gastos (transacciones)
  // -------------------------------------------------------------------------

  router.get('/:year/:month/transactions', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const categoryId = c.req.query('categoryId')

    const base = db.select().from(expenseTransactions)
    const rows =
      categoryId === undefined
        ? base
            .where(eq(expenseTransactions.periodId, period.id))
            .orderBy(asc(expenseTransactions.id))
            .all()
        : base
            .where(
              and(
                eq(expenseTransactions.periodId, period.id),
                eq(expenseTransactions.expenseCategoryId, parseIdParam(categoryId, 'categoryId')),
              ),
            )
            .orderBy(asc(expenseTransactions.id))
            .all()

    return c.json(rows.map(toTransactionResponse))
  })

  router.post('/:year/:month/transactions', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const input = await parseBody(c, transactionCreateSchema)

    const category = db
      .select()
      .from(monthlyExpenseCategories)
      .where(
        and(
          eq(monthlyExpenseCategories.id, input.expenseCategoryId),
          eq(monthlyExpenseCategories.periodId, period.id),
        ),
      )
      .get()

    if (!category) {
      return c.json(
        { error: 'La categoría de gasto no pertenece a este mes' },
        422,
      )
    }

    const row = db
      .insert(expenseTransactions)
      .values({
        periodId: period.id,
        expenseCategoryId: input.expenseCategoryId,
        amount: input.amount,
        date: input.date ?? null,
        notes: input.notes ?? '',
      })
      .returning()
      .get()

    return c.json(toTransactionResponse(row), 201)
  })

  router.put('/:year/:month/transactions/:id', async (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, transactionUpdateSchema)

    if (!hasKeys(input)) return c.json({ error: 'Nada que actualizar' }, 422)

    const existing = db
      .select()
      .from(expenseTransactions)
      .where(
        and(
          eq(expenseTransactions.id, id),
          eq(expenseTransactions.periodId, period.id),
        ),
      )
      .get()
    if (!existing) return c.json({ error: 'Transacción no encontrada' }, 404)

    if (input.expenseCategoryId !== undefined) {
      const category = db
        .select()
        .from(monthlyExpenseCategories)
        .where(
          and(
            eq(monthlyExpenseCategories.id, input.expenseCategoryId),
            eq(monthlyExpenseCategories.periodId, period.id),
          ),
        )
        .get()
      if (!category) {
        return c.json({ error: 'La categoría de gasto no pertenece a este mes' }, 422)
      }
    }

    const updated = db
      .update(expenseTransactions)
      .set(input)
      .where(eq(expenseTransactions.id, id))
      .returning()
      .get()
    return c.json(toTransactionResponse(updated))
  })

  router.delete('/:year/:month/transactions/:id', (c) => {
    const { year, month } = parseYearMonth(c)
    const period = requirePeriod(db, year, month)
    const id = parseIdParam(c.req.param('id'))

    const deleted = db
      .delete(expenseTransactions)
      .where(
        and(
          eq(expenseTransactions.id, id),
          eq(expenseTransactions.periodId, period.id),
        ),
      )
      .returning()
      .get()

    if (!deleted) return c.json({ error: 'Transacción no encontrada' }, 404)
    return c.json({ deleted: true, id })
  })

  return router
}
