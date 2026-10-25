/** Composición de todos los routers de la API bajo `/api`. */

import { Hono } from 'hono'
import { getDatabaseStatus, type DatabaseConnection } from '../db'
import { createBackupRoutes } from './backup'
import { createCatalogRoutes } from './catalog'
import { createMonthRoutes } from './months'
import { createSettingsRoutes } from './settings'
import { createSimulationRoutes } from './simulations'
import { createYearRoutes } from './years'

export function createApiRoutes(connection: DatabaseConnection) {
  const api = new Hono()

  api.get('/health', (c) =>
    c.json({
      status: 'ok',
      stage: 3,
      database: 'ready',
      ...getDatabaseStatus(connection.db, connection.path),
      timestamp: new Date().toISOString(),
    }),
  )

  api.route('/settings', createSettingsRoutes(connection.db))
  api.route('/catalog', createCatalogRoutes(connection.db))
  api.route('/years', createYearRoutes(connection.db))
  api.route('/months', createMonthRoutes(connection.db))
  api.route('/simulations', createSimulationRoutes(connection.db))
  api.route('/backup', createBackupRoutes(connection))

  return api
}
