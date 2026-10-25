/**
 * Utilidades compartidas por los routers de la API: parseo de parámetros,
 * validación del cuerpo y búsqueda de entidades con errores HTTP claros.
 */

import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { and, eq } from 'drizzle-orm'
import type { z } from 'zod'
import { monthlyPeriods, settings, years } from '../../shared/schema'
import type { AppDatabase } from '../db'

/** Lee y valida el cuerpo JSON; lanza 400/422 con detalle de los campos. */
export async function parseBody<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HTTPException(400, { message: 'El cuerpo de la petición debe ser JSON válido' })
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new HTTPException(422, { message: 'Datos inválidos', cause: result.error })
  }
  return result.data
}

/** Convierte un parámetro de ruta a un ID numérico positivo. */
export function parseIdParam(value: string | undefined, label = 'id'): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HTTPException(400, { message: `${label} inválido` })
  }
  return parsed
}

/** Parsea y valida los parámetros `:year` y `:month`. */
export function parseYearMonth(c: Context): { year: number; month: number } {
  const year = Number(c.req.param('year'))
  const month = Number(c.req.param('month'))
  if (!Number.isInteger(year) || year < 1900 || year > 3000) {
    throw new HTTPException(400, { message: 'Año inválido' })
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new HTTPException(400, { message: 'Mes inválido (1–12)' })
  }
  return { year, month }
}

/** Exige que el año exista en la base. */
export function requireYear(db: AppDatabase, year: number) {
  const row = db.select().from(years).where(eq(years.year, year)).get()
  if (!row) {
    throw new HTTPException(404, { message: `El año ${year} no existe` })
  }
  return row
}

/** Exige que el periodo (año + mes) exista en la base. */
export function requirePeriod(db: AppDatabase, year: number, month: number) {
  const row = db
    .select()
    .from(monthlyPeriods)
    .where(and(eq(monthlyPeriods.year, year), eq(monthlyPeriods.month, month)))
    .get()
  if (!row) {
    throw new HTTPException(404, {
      message: `El mes ${year}-${String(month).padStart(2, '0')} no existe. Crea el año primero.`,
    })
  }
  return row
}

/** Exige que la configuración global exista (fila única id = 1). */
export function requireSettings(db: AppDatabase) {
  const row = db.select().from(settings).where(eq(settings.id, 1)).get()
  if (!row) {
    throw new HTTPException(404, { message: 'La configuración no está inicializada' })
  }
  return row
}
