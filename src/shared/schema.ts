/**
 * Esquema relacional SQLite (Drizzle ORM) — AGENTS.md §4.1.
 *
 * Convenciones:
 *  - Montos: `real` (nunca se redondea en la base; el redondeo es de presentación).
 *  - Fechas: texto ISO `YYYY-MM-DD` (ordenable y portable entre Linux/Windows).
 *  - Booleanos: `integer` en modo `boolean`.
 *  - Claves foráneas con `onDelete` explícito (`cascade` para datos dependientes,
 *    `set null` para vínculos opcionales al catálogo maestro).
 */

import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/** Secciones presupuestarias (los 5 bloques del Excel). */
export const SECTION_KEYS = ['income', 'bill', 'expense', 'saving', 'debt'] as const
export type CatalogSection = (typeof SECTION_KEYS)[number]

const nowIso = () => new Date().toISOString()

/** Configuración global de la aplicación (fila única, id = 1). */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  currencySymbol: text('currency_symbol').notNull().default('$'),
  currencyCode: text('currency_code').notNull().default('USD'),
  locale: text('locale').notNull().default('es-MX'),
  decimalPlaces: integer('decimal_places').notNull().default(2),
  defaultYear: integer('default_year'),
})

/** Catálogo maestro de conceptos y categorías recurrentes. */
export const catalogItems = sqliteTable(
  'catalog_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    section: text('section', { enum: SECTION_KEYS }).notNull(),
    name: text('name').notNull(),
    defaultAmount: real('default_amount').notNull().default(0),
    /** Monto total a pagar (solo deudas). `null` = seguimiento sin definir. */
    totalAmount: real('total_amount'),
    defaultDayOfMonth: integer('default_day_of_month'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().$defaultFn(nowIso),
  },
  (table) => [index('catalog_items_section_idx').on(table.section, table.sortOrder)],
)

/** Años fiscales gestionados (multi-año, a diferencia del Excel). */
export const years = sqliteTable('years', {
  year: integer('year').primaryKey(),
  goalsTitle: text('goals_title').notNull().default('MIS METAS FINANCIERAS'),
  notesTitle: text('notes_title').notNull().default('NOTAS'),
  notesContent: text('notes_content').notNull().default(''),
  createdAt: text('created_at').notNull().$defaultFn(nowIso),
})

/** Metas financieras editables por año. */
export const annualGoals = sqliteTable(
  'annual_goals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    year: integer('year')
      .notNull()
      .references(() => years.year, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    targetAmount: real('target_amount'),
    isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('annual_goals_year_idx').on(table.year, table.sortOrder)],
)

/** Control de los 12 meses de cada año. */
export const monthlyPeriods = sqliteTable(
  'monthly_periods',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    year: integer('year')
      .notNull()
      .references(() => years.year, { onDelete: 'cascade' }),
    month: integer('month').notNull(),
    isInitialized: integer('is_initialized', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [uniqueIndex('monthly_periods_year_month_unique').on(table.year, table.month)],
)

/** Bloque 1 — Ingresos del mes. */
export const monthlyIncomes = sqliteTable(
  'monthly_incomes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodId: integer('period_id')
      .notNull()
      .references(() => monthlyPeriods.id, { onDelete: 'cascade' }),
    catalogItemId: integer('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    date: text('date'),
    expectedAmount: real('expected_amount').notNull().default(0),
    actualAmount: real('actual_amount').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('monthly_incomes_period_idx').on(table.periodId, table.sortOrder)],
)

/** Bloque 2 — Facturas / pagos fijos del mes. */
export const monthlyBills = sqliteTable(
  'monthly_bills',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodId: integer('period_id')
      .notNull()
      .references(() => monthlyPeriods.id, { onDelete: 'cascade' }),
    catalogItemId: integer('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    dueDate: text('due_date'),
    isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
    budgetAmount: real('budget_amount').notNull().default(0),
    actualAmount: real('actual_amount').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('monthly_bills_period_idx').on(table.periodId, table.sortOrder)],
)

/**
 * Bloque 3 — Presupuesto de gastos variables del mes.
 * NO tiene columna `actual_amount`: el valor real se deriva siempre de
 * `expense_transactions` (regla de oro, AGENTS.md §8.1).
 */
export const monthlyExpenseCategories = sqliteTable(
  'monthly_expense_categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodId: integer('period_id')
      .notNull()
      .references(() => monthlyPeriods.id, { onDelete: 'cascade' }),
    catalogItemId: integer('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    budgetAmount: real('budget_amount').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    index('monthly_expense_categories_period_idx').on(table.periodId, table.sortOrder),
  ],
)

/** Registro diario de gastos (transacciones del mes). */
export const expenseTransactions = sqliteTable(
  'expense_transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodId: integer('period_id')
      .notNull()
      .references(() => monthlyPeriods.id, { onDelete: 'cascade' }),
    expenseCategoryId: integer('expense_category_id')
      .notNull()
      .references(() => monthlyExpenseCategories.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    date: text('date'),
    notes: text('notes').notNull().default(''),
    createdAt: text('created_at').notNull().$defaultFn(nowIso),
  },
  (table) => [
    index('expense_transactions_period_idx').on(table.periodId),
    index('expense_transactions_category_idx').on(table.expenseCategoryId),
  ],
)

/** Bloque 4 — Ahorros del mes. */
export const monthlySavings = sqliteTable(
  'monthly_savings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodId: integer('period_id')
      .notNull()
      .references(() => monthlyPeriods.id, { onDelete: 'cascade' }),
    catalogItemId: integer('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    projectedAmount: real('projected_amount').notNull().default(0),
    actualAmount: real('actual_amount').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('monthly_savings_period_idx').on(table.periodId, table.sortOrder)],
)

/** Bloque 5 — Pagos de deuda del mes. */
export const monthlyDebts = sqliteTable(
  'monthly_debts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    periodId: integer('period_id')
      .notNull()
      .references(() => monthlyPeriods.id, { onDelete: 'cascade' }),
    catalogItemId: integer('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    expectedAmount: real('expected_amount').notNull().default(0),
    actualAmount: real('actual_amount').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('monthly_debts_period_idx').on(table.periodId, table.sortOrder)],
)

/** Escenarios guardados de la calculadora de interés compuesto. */
export const compoundSimulations = sqliteTable('compound_simulations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  initialCapital: real('initial_capital').notNull(),
  /** Tasa mensual como fracción (0.06 = 6%). */
  monthlyRate: real('monthly_rate').notNull(),
  months: integer('months').notNull().default(24),
  monthlyContribution: real('monthly_contribution').notNull().default(0),
  /** Mapa JSON `{ [mes]: monto }` con los retiros simulados. */
  withdrawalsJson: text('withdrawals_json').notNull().default('{}'),
  createdAt: text('created_at').notNull().$defaultFn(nowIso),
})

/** Tipos inferidos para uso en la API y el frontend. */
export type SettingsRow = typeof settings.$inferSelect
export type CatalogItemRow = typeof catalogItems.$inferSelect
export type YearRow = typeof years.$inferSelect
export type AnnualGoalRow = typeof annualGoals.$inferSelect
export type MonthlyPeriodRow = typeof monthlyPeriods.$inferSelect
export type MonthlyIncomeRow = typeof monthlyIncomes.$inferSelect
export type MonthlyBillRow = typeof monthlyBills.$inferSelect
export type MonthlyExpenseCategoryRow = typeof monthlyExpenseCategories.$inferSelect
export type ExpenseTransactionRow = typeof expenseTransactions.$inferSelect
export type MonthlySavingRow = typeof monthlySavings.$inferSelect
export type MonthlyDebtRow = typeof monthlyDebts.$inferSelect
export type CompoundSimulationRow = typeof compoundSimulations.$inferSelect
