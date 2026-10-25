/** Rutas anuales: años, notas, metas y consolidado (`/api/years`). */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { and, asc, count, desc, eq, max } from 'drizzle-orm'
import { buildAnnualSummary, createEmptyMonthlyData } from '../../shared/calculations'
import { annualGoals, monthlyPeriods, settings, years } from '../../shared/schema'
import {
  goalCreateSchema,
  goalUpdateSchema,
  yearCreateSchema,
  yearUpdateSchema,
} from '../../shared/validation'
import type { AppDatabase } from '../db'
import { loadMonthlyData } from '../month-service'
import { parseBody, parseIdParam, requireYear } from './helpers'

function parseYearParam(value: string | undefined): number {
  const year = Number(value)
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    throw new HTTPException(400, { message: 'Año inválido' })
  }
  return year
}

export function createYearRoutes(db: AppDatabase) {
  const router = new Hono()

  router.get('/', (c) => {
    const rows = db.select().from(years).orderBy(desc(years.year)).all()
    return c.json(rows)
  })

  router.post('/', async (c) => {
    const { year } = await parseBody(c, yearCreateSchema)

    const existing = db.select().from(years).where(eq(years.year, year)).get()
    if (existing) {
      return c.json({ error: `El año ${year} ya existe` }, 409)
    }

    db.transaction((tx) => {
      tx.insert(years).values({ year }).run()
      tx.insert(monthlyPeriods)
        .values(
          Array.from({ length: 12 }, (_, index) => ({
            year,
            month: index + 1,
            isInitialized: false,
          })),
        )
        .run()
    })

    return c.json(db.select().from(years).where(eq(years.year, year)).get(), 201)
  })

  router.get('/:year', (c) => {
    const row = requireYear(db, parseYearParam(c.req.param('year')))
    const goals = db
      .select()
      .from(annualGoals)
      .where(eq(annualGoals.year, row.year))
      .orderBy(asc(annualGoals.sortOrder), asc(annualGoals.id))
      .all()
    return c.json({ ...row, goals })
  })

  router.put('/:year', async (c) => {
    const year = parseYearParam(c.req.param('year'))
    requireYear(db, year)
    const patch = await parseBody(c, yearUpdateSchema)

    const updated = db.update(years).set(patch).where(eq(years.year, year)).returning().get()
    return c.json(updated)
  })

  router.delete('/:year', (c) => {
    const year = parseYearParam(c.req.param('year'))
    requireYear(db, year)

    const totalYears = db.select({ value: count() }).from(years).get()?.value ?? 0
    if (totalYears <= 1) {
      return c.json(
        { error: 'No puedes eliminar el único año fiscal. Crea otro año primero.' },
        409,
      )
    }

    db.transaction((tx) => {
      // Si el año eliminado era el predeterminado, se limpia la preferencia.
      tx.update(settings).set({ defaultYear: null }).where(eq(settings.defaultYear, year)).run()
      // Los periodos, filas mensuales y metas se eliminan en cascada.
      tx.delete(years).where(eq(years.year, year)).run()
    })

    return c.json({ deleted: true, year })
  })

  router.get('/:year/summary', (c) => {
    const year = parseYearParam(c.req.param('year'))
    const yearRow = requireYear(db, year)

    const periods = db
      .select()
      .from(monthlyPeriods)
      .where(eq(monthlyPeriods.year, year))
      .orderBy(asc(monthlyPeriods.month))
      .all()
    const periodByMonth = new Map(periods.map((period) => [period.month, period]))

    const months = Array.from({ length: 12 }, (_, index) => {
      const period = periodByMonth.get(index + 1)
      return period ? loadMonthlyData(db, period.id) : createEmptyMonthlyData()
    })

    const goals = db
      .select()
      .from(annualGoals)
      .where(eq(annualGoals.year, year))
      .orderBy(asc(annualGoals.sortOrder), asc(annualGoals.id))
      .all()

    return c.json({
      year: yearRow,
      goals,
      initializedMonths: periods.filter((period) => period.isInitialized).map((p) => p.month),
      summary: buildAnnualSummary(months),
    })
  })

  router.get('/:year/goals', (c) => {    const year = parseYearParam(c.req.param('year'))
    requireYear(db, year)
    const rows = db
      .select()
      .from(annualGoals)
      .where(eq(annualGoals.year, year))
      .orderBy(asc(annualGoals.sortOrder), asc(annualGoals.id))
      .all()
    return c.json(rows)
  })

  router.post('/:year/goals', async (c) => {
    const year = parseYearParam(c.req.param('year'))
    requireYear(db, year)
    const input = await parseBody(c, goalCreateSchema)

    const highest = db
      .select({ value: max(annualGoals.sortOrder) })
      .from(annualGoals)
      .where(eq(annualGoals.year, year))
      .get()?.value

    const row = db
      .insert(annualGoals)
      .values({
        year,
        description: input.description,
        targetAmount: input.targetAmount ?? null,
        isCompleted: input.isCompleted ?? false,
        sortOrder: (highest ?? -1) + 1,
      })
      .returning()
      .get()

    return c.json(row, 201)
  })

  router.put('/:year/goals/:goalId', async (c) => {
    const year = parseYearParam(c.req.param('year'))
    requireYear(db, year)
    const goalId = parseIdParam(c.req.param('goalId'), 'goalId')
    const input = await parseBody(c, goalUpdateSchema)

    const existing = db
      .select()
      .from(annualGoals)
      .where(and(eq(annualGoals.id, goalId), eq(annualGoals.year, year)))
      .get()
    if (!existing) {
      return c.json({ error: 'Meta financiera no encontrada' }, 404)
    }

    const updated = db
      .update(annualGoals)
      .set(input)
      .where(eq(annualGoals.id, goalId))
      .returning()
      .get()
    return c.json(updated)
  })

  router.delete('/:year/goals/:goalId', (c) => {
    const year = parseYearParam(c.req.param('year'))
    requireYear(db, year)
    const goalId = parseIdParam(c.req.param('goalId'), 'goalId')

    const deleted = db
      .delete(annualGoals)
      .where(and(eq(annualGoals.id, goalId), eq(annualGoals.year, year)))
      .returning()
      .get()

    if (!deleted) {
      return c.json({ error: 'Meta financiera no encontrada' }, 404)
    }
    return c.json({ deleted: true, id: goalId })
  })

  return router
}
