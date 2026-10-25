/** Rutas de escenarios de interés compuesto (`/api/simulations`). */

import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { compoundSimulations, type CompoundSimulationRow } from '../../shared/schema'
import { simulationCreateSchema, simulationUpdateSchema } from '../../shared/validation'
import type { AppDatabase } from '../db'
import { parseBody, parseIdParam } from './helpers'

function parseWithdrawals(json: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(json)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, number>
    }
  } catch {
    // Respaldo corrupto: se devuelve un mapa vacío en lugar de romper la API.
  }
  return {}
}

function toResponse(row: CompoundSimulationRow) {
  const { withdrawalsJson, ...rest } = row
  return { ...rest, withdrawals: parseWithdrawals(withdrawalsJson) }
}

export function createSimulationRoutes(db: AppDatabase) {
  const router = new Hono()

  router.get('/', (c) => {
    const rows = db
      .select()
      .from(compoundSimulations)
      .orderBy(desc(compoundSimulations.id))
      .all()
    return c.json(rows.map(toResponse))
  })

  router.get('/:id', (c) => {
    const id = parseIdParam(c.req.param('id'))
    const row = db
      .select()
      .from(compoundSimulations)
      .where(eq(compoundSimulations.id, id))
      .get()
    if (!row) return c.json({ error: 'Simulación no encontrada' }, 404)
    return c.json(toResponse(row))
  })

  router.post('/', async (c) => {
    const input = await parseBody(c, simulationCreateSchema)

    const row = db
      .insert(compoundSimulations)
      .values({
        name: input.name,
        initialCapital: input.initialCapital,
        monthlyRate: input.monthlyRate,
        months: input.months,
        monthlyContribution: input.monthlyContribution ?? 0,
        withdrawalsJson: JSON.stringify(input.withdrawals ?? {}),
      })
      .returning()
      .get()

    return c.json(toResponse(row), 201)
  })

  router.put('/:id', async (c) => {
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, simulationUpdateSchema)

    const existing = db
      .select()
      .from(compoundSimulations)
      .where(eq(compoundSimulations.id, id))
      .get()
    if (!existing) return c.json({ error: 'Simulación no encontrada' }, 404)

    const { withdrawals, ...rest } = input
    if (withdrawals === undefined && Object.keys(rest).length === 0) {
      return c.json({ error: 'Nada que actualizar' }, 422)
    }

    const updated = db
      .update(compoundSimulations)
      .set({
        ...rest,
        ...(withdrawals === undefined
          ? {}
          : { withdrawalsJson: JSON.stringify(withdrawals) }),
      })
      .where(eq(compoundSimulations.id, id))
      .returning()
      .get()

    return c.json(toResponse(updated))
  })

  router.delete('/:id', (c) => {
    const id = parseIdParam(c.req.param('id'))
    const deleted = db
      .delete(compoundSimulations)
      .where(eq(compoundSimulations.id, id))
      .returning()
      .get()

    if (!deleted) return c.json({ error: 'Simulación no encontrada' }, 404)
    return c.json({ deleted: true, id })
  })

  return router
}
