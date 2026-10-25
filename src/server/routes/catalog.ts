/** Rutas del catálogo maestro de conceptos recurrentes (`/api/catalog`). */

import { Hono } from 'hono'
import { asc, eq, max } from 'drizzle-orm'
import { catalogItems, SECTION_KEYS } from '../../shared/schema'
import {
  catalogCreateSchema,
  catalogReorderSchema,
  catalogUpdateSchema,
} from '../../shared/validation'
import type { AppDatabase } from '../db'
import { parseBody, parseIdParam } from './helpers'

export function createCatalogRoutes(db: AppDatabase) {
  const router = new Hono()

  router.get('/', (c) => {
    const section = c.req.query('section')
    if (section && !SECTION_KEYS.includes(section as (typeof SECTION_KEYS)[number])) {
      return c.json({ error: 'Sección inválida' }, 400)
    }

    const rows = section
      ? db
          .select()
          .from(catalogItems)
          .where(eq(catalogItems.section, section as (typeof SECTION_KEYS)[number]))
          .orderBy(asc(catalogItems.sortOrder), asc(catalogItems.id))
          .all()
      : db
          .select()
          .from(catalogItems)
          .orderBy(asc(catalogItems.section), asc(catalogItems.sortOrder), asc(catalogItems.id))
          .all()

    return c.json(rows)
  })

  router.post('/', async (c) => {
    const input = await parseBody(c, catalogCreateSchema)

    const highest = db
      .select({ value: max(catalogItems.sortOrder) })
      .from(catalogItems)
      .where(eq(catalogItems.section, input.section))
      .get()?.value

    const row = db
      .insert(catalogItems)
      .values({
        section: input.section,
        name: input.name,
        defaultAmount: input.defaultAmount ?? 0,
        totalAmount: input.totalAmount ?? null,
        defaultDayOfMonth: input.defaultDayOfMonth ?? null,
        isActive: input.isActive ?? true,
        sortOrder: (highest ?? -1) + 1,
      })
      .returning()
      .get()

    return c.json(row, 201)
  })

  // Debe registrarse antes de `/:id` para no interpretar "reorder" como ID.
  router.put('/reorder', async (c) => {
    const input = await parseBody(c, catalogReorderSchema)

    const rows = db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.section, input.section))
      .all()
    const idsInSection = new Set(rows.map((row) => row.id))

    if (
      input.ids.length !== rows.length ||
      input.ids.some((id) => !idsInSection.has(id))
    ) {
      return c.json(
        {
          error:
            'La lista de IDs debe incluir exactamente todos los ítems de la sección, sin repetidos',
        },
        422,
      )
    }

    db.transaction((tx) => {
      input.ids.forEach((id, index) => {
        tx.update(catalogItems)
          .set({ sortOrder: index })
          .where(eq(catalogItems.id, id))
          .run()
      })
    })

    const updated = db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.section, input.section))
      .orderBy(asc(catalogItems.sortOrder), asc(catalogItems.id))
      .all()

    return c.json(updated)
  })

  router.put('/:id', async (c) => {
    const id = parseIdParam(c.req.param('id'))
    const input = await parseBody(c, catalogUpdateSchema)

    const existing = db.select().from(catalogItems).where(eq(catalogItems.id, id)).get()
    if (!existing) {
      return c.json({ error: 'Ítem del catálogo no encontrado' }, 404)
    }

    if (input.section && input.section !== existing.section) {
      return c.json(
        { error: 'La sección de un ítem no se puede cambiar; crea uno nuevo en su lugar' },
        422,
      )
    }

    const updated = db
      .update(catalogItems)
      .set(input)
      .where(eq(catalogItems.id, id))
      .returning()
      .get()

    return c.json(updated)
  })

  router.delete('/:id', (c) => {
    const id = parseIdParam(c.req.param('id'))
    const deleted = db.delete(catalogItems).where(eq(catalogItems.id, id)).returning().get()

    if (!deleted) {
      return c.json({ error: 'Ítem del catálogo no encontrado' }, 404)
    }
    return c.json({ deleted: true, id })
  })

  return router
}
