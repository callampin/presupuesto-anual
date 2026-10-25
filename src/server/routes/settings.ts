/** Rutas de configuración global (`/api/settings`). */

import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { settings } from '../../shared/schema'
import { settingsUpdateSchema } from '../../shared/validation'
import type { AppDatabase } from '../db'
import { parseBody, requireSettings } from './helpers'

export function createSettingsRoutes(db: AppDatabase) {
  const router = new Hono()

  router.get('/', (c) => c.json(requireSettings(db)))

  router.put('/', async (c) => {
    const patch = await parseBody(c, settingsUpdateSchema)
    const updated = db
      .update(settings)
      .set(patch)
      .where(eq(settings.id, 1))
      .returning()
      .get()

    if (!updated) {
      return c.json({ error: 'La configuración no está inicializada' }, 404)
    }
    return c.json(updated)
  })

  return router
}
