/**
 * Aplicación Hono completa (API + manejo uniforme de errores).
 *
 * Se separa del punto de entrada para poder testearla con `app.request()`
 * usando una base de datos temporal.
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import type { DatabaseConnection } from './db'
import { createApiRoutes } from './routes'

export function createApp(connection: DatabaseConnection) {
  const app = new Hono()

  app.route('/api', createApiRoutes(connection))

  // Cualquier ruta /api no registrada responde JSON (nunca el index.html).
  app.all('/api/*', (c) => c.json({ error: 'Ruta de API no encontrada' }, 404))

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      const cause = error.cause
      if (cause instanceof ZodError) {
        return c.json(
          {
            error: error.message,
            issues: cause.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
          error.status,
        )
      }
      return c.json({ error: error.message }, error.status)
    }

    console.error('[api] Error no controlado:', error)
    return c.json({ error: 'Error interno del servidor' }, 500)
  })

  return app
}
