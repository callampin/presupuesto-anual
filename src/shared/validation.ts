/**
 * Esquemas de validación compartidos (Zod) — usados por la API y, más adelante,
 * por el frontend. Mantener una única fuente de verdad evita divergencias.
 */

import { z } from 'zod'
import { isValidIsoDate } from './dates'
import { SECTION_KEYS } from './schema'

/** Identificador numérico de fila SQLite. */
export const idSchema = z.number().int().positive()

/** Monto finito (puede ser negativo para ajustes o devoluciones). */
export const amountSchema = z.number().finite()

/** Fecha ISO `YYYY-MM-DD` real. */
export const isoDateSchema = z
  .string()
  .refine(isValidIsoDate, { message: 'Fecha inválida (formato YYYY-MM-DD)' })

/** Fecha ISO opcional o nula. */
export const optionalIsoDateSchema = isoDateSchema.nullable().optional()

/** Nombre de concepto, categoría o meta. */
export const nameSchema = z.string().trim().min(1).max(120)

/** Año fiscal razonable. */
export const yearSchema = z.number().int().min(1900).max(3000)

/** Mes del año (1 = Enero). */
export const monthSchema = z.number().int().min(1).max(12)

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

export const settingsUpdateSchema = z
  .object({
    currencySymbol: z.string().trim().min(1).max(5),
    currencyCode: z.string().trim().min(1).max(10),
    locale: z.string().trim().min(2).max(20),
    decimalPlaces: z.number().int().min(0).max(4),
    defaultYear: yearSchema.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  })

// ---------------------------------------------------------------------------
// Catálogo maestro
// ---------------------------------------------------------------------------

export const catalogCreateSchema = z.object({
  section: z.enum(SECTION_KEYS),
  name: nameSchema,
  defaultAmount: amountSchema.optional(),
  totalAmount: z.number().finite().nonnegative().nullable().optional(),
  defaultDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const catalogUpdateSchema = catalogCreateSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
})

export const catalogReorderSchema = z.object({
  section: z.enum(SECTION_KEYS),
  ids: z.array(idSchema).min(1),
})

// ---------------------------------------------------------------------------
// Años y metas
// ---------------------------------------------------------------------------

export const yearCreateSchema = z.object({ year: yearSchema })

export const yearUpdateSchema = z
  .object({
    goalsTitle: z.string().trim().min(1).max(80),
    notesTitle: z.string().trim().min(1).max(80),
    notesContent: z.string().max(20000),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  })

export const goalCreateSchema = z.object({
  description: z.string().trim().min(1).max(300),
  targetAmount: amountSchema.nullable().optional(),
  isCompleted: z.boolean().optional(),
})

export const goalUpdateSchema = goalCreateSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
})

// ---------------------------------------------------------------------------
// Inicialización de mes
// ---------------------------------------------------------------------------

export const monthInitializeSchema = z.object({
  source: z.enum(['catalog', 'previous', 'blank']),
})

// ---------------------------------------------------------------------------
// Filas de los 5 bloques mensuales
// ---------------------------------------------------------------------------

export const incomeCreateSchema = z.object({
  name: nameSchema,
  date: optionalIsoDateSchema,
  expectedAmount: amountSchema.optional(),
  actualAmount: amountSchema.optional(),
})

export const incomeUpdateSchema = incomeCreateSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
})

export const billCreateSchema = z.object({
  name: nameSchema,
  dueDate: optionalIsoDateSchema,
  isPaid: z.boolean().optional(),
  budgetAmount: amountSchema.optional(),
  actualAmount: amountSchema.optional(),
})

export const billUpdateSchema = billCreateSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
})

export const expenseCategoryCreateSchema = z.object({
  name: nameSchema,
  budgetAmount: amountSchema.optional(),
})

export const expenseCategoryUpdateSchema = expenseCategoryCreateSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
})

export const savingCreateSchema = z.object({
  name: nameSchema,
  projectedAmount: amountSchema.optional(),
  actualAmount: amountSchema.optional(),
})

export const savingUpdateSchema = savingCreateSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
})

export const debtCreateSchema = z.object({
  name: nameSchema,
  expectedAmount: amountSchema.optional(),
  actualAmount: amountSchema.optional(),
  /** Vínculo opcional con el catálogo para llevar el saldo de la deuda. */
  catalogItemId: idSchema.nullable().optional(),
})

export const debtUpdateSchema = debtCreateSchema.partial().extend({
  sortOrder: z.number().int().min(0).optional(),
})

// ---------------------------------------------------------------------------
// Registro de gastos
// ---------------------------------------------------------------------------

export const transactionCreateSchema = z.object({
  expenseCategoryId: idSchema,
  amount: amountSchema,
  date: optionalIsoDateSchema,
  notes: z.string().max(500).optional(),
})

export const transactionUpdateSchema = transactionCreateSchema.partial()

// ---------------------------------------------------------------------------
// Simulaciones de interés compuesto
// ---------------------------------------------------------------------------

const withdrawalsSchema = z
  .record(z.string(), z.number().finite())
  .refine(
    (value) => Object.keys(value).every((key) => /^[1-9]\d*$/.test(key)),
    { message: 'Las claves de retiros deben ser números de mes (1, 2, 3…)' },
  )

export const simulationCreateSchema = z.object({
  name: nameSchema,
  initialCapital: amountSchema,
  monthlyRate: z.number().min(-1).max(1),
  months: z.number().int().min(1).max(1200),
  monthlyContribution: amountSchema.optional(),
  withdrawals: withdrawalsSchema.optional(),
})

export const simulationUpdateSchema = simulationCreateSchema.partial()

// ---------------------------------------------------------------------------
// Respaldo completo (export/import JSON)
// ---------------------------------------------------------------------------

const settingsRowSchema = z.object({
  id: z.number().int(),
  currencySymbol: z.string(),
  currencyCode: z.string(),
  locale: z.string(),
  decimalPlaces: z.number().int(),
  defaultYear: z.number().int().nullable(),
})

const catalogItemRowSchema = z.object({
  id: idSchema,
  section: z.enum(SECTION_KEYS),
  name: z.string(),
  defaultAmount: z.number(),
  totalAmount: z.number().nullable().optional(),
  defaultDayOfMonth: z.number().int().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

const yearRowSchema = z.object({
  year: yearSchema,
  goalsTitle: z.string(),
  notesTitle: z.string(),
  notesContent: z.string(),
  createdAt: z.string(),
})

const annualGoalRowSchema = z.object({
  id: idSchema,
  year: yearSchema,
  description: z.string(),
  targetAmount: z.number().nullable(),
  isCompleted: z.boolean(),
  sortOrder: z.number().int(),
})

const monthlyPeriodRowSchema = z.object({
  id: idSchema,
  year: yearSchema,
  month: monthSchema,
  isInitialized: z.boolean(),
})

const incomeRowSchema = z.object({
  id: idSchema,
  periodId: idSchema,
  catalogItemId: idSchema.nullable(),
  name: z.string(),
  date: z.string().nullable(),
  expectedAmount: z.number(),
  actualAmount: z.number(),
  sortOrder: z.number().int(),
})

const billRowSchema = z.object({
  id: idSchema,
  periodId: idSchema,
  catalogItemId: idSchema.nullable(),
  name: z.string(),
  dueDate: z.string().nullable(),
  isPaid: z.boolean(),
  budgetAmount: z.number(),
  actualAmount: z.number(),
  sortOrder: z.number().int(),
})

const expenseCategoryRowSchema = z.object({
  id: idSchema,
  periodId: idSchema,
  catalogItemId: idSchema.nullable(),
  name: z.string(),
  budgetAmount: z.number(),
  sortOrder: z.number().int(),
})

const transactionRowSchema = z.object({
  id: idSchema,
  periodId: idSchema,
  expenseCategoryId: idSchema,
  amount: z.number(),
  date: z.string().nullable(),
  notes: z.string(),
  createdAt: z.string(),
})

const savingRowSchema = z.object({
  id: idSchema,
  periodId: idSchema,
  catalogItemId: idSchema.nullable(),
  name: z.string(),
  projectedAmount: z.number(),
  actualAmount: z.number(),
  sortOrder: z.number().int(),
})

const debtRowSchema = z.object({
  id: idSchema,
  periodId: idSchema,
  catalogItemId: idSchema.nullable(),
  name: z.string(),
  expectedAmount: z.number(),
  actualAmount: z.number(),
  sortOrder: z.number().int(),
})

const simulationRowSchema = z.object({
  id: idSchema,
  name: z.string(),
  initialCapital: z.number(),
  monthlyRate: z.number(),
  months: z.number().int(),
  monthlyContribution: z.number(),
  withdrawalsJson: z.string(),
  createdAt: z.string(),
})

export const backupSchema = z.object({
  app: z.literal('presupuesto-personal'),
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    settings: z.array(settingsRowSchema),
    years: z.array(yearRowSchema),
    catalogItems: z.array(catalogItemRowSchema),
    annualGoals: z.array(annualGoalRowSchema),
    monthlyPeriods: z.array(monthlyPeriodRowSchema),
    monthlyIncomes: z.array(incomeRowSchema),
    monthlyBills: z.array(billRowSchema),
    monthlyExpenseCategories: z.array(expenseCategoryRowSchema),
    expenseTransactions: z.array(transactionRowSchema),
    monthlySavings: z.array(savingRowSchema),
    monthlyDebts: z.array(debtRowSchema),
    compoundSimulations: z.array(simulationRowSchema),
  }),
})

export type BackupPayload = z.infer<typeof backupSchema>

/** Confirmación explícita para borrar todos los datos. */
export const resetDataSchema = z.object({
  confirmation: z.literal('ELIMINAR'),
})
