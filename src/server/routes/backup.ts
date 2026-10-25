/**
 * Rutas de respaldo local (`/api/backup`):
 *  - Exportar todo a JSON.
 *  - Importar JSON validado (transaccional).
 *  - Descargar una copia consistente del archivo SQLite.
 */

import { Hono } from 'hono'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  annualGoals,
  catalogItems,
  compoundSimulations,
  expenseTransactions,
  monthlyBills,
  monthlyDebts,
  monthlyExpenseCategories,
  monthlyIncomes,
  monthlyPeriods,
  monthlySavings,
  settings,
  years,
} from '../../shared/schema'
import { backupSchema, resetDataSchema } from '../../shared/validation'
import { seedInitialData, type DatabaseConnection } from '../db'
import { parseBody } from './helpers'

const APP_ID = 'presupuesto-personal'
const BACKUP_VERSION = 1

export function createBackupRoutes(connection: DatabaseConnection) {
  const { db, sqlite } = connection
  const router = new Hono()

  router.get('/export-json', (c) => {
    const payload = {
      app: APP_ID,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        settings: db.select().from(settings).all(),
        years: db.select().from(years).all(),
        catalogItems: db.select().from(catalogItems).all(),
        annualGoals: db.select().from(annualGoals).all(),
        monthlyPeriods: db.select().from(monthlyPeriods).all(),
        monthlyIncomes: db.select().from(monthlyIncomes).all(),
        monthlyBills: db.select().from(monthlyBills).all(),
        monthlyExpenseCategories: db.select().from(monthlyExpenseCategories).all(),
        expenseTransactions: db.select().from(expenseTransactions).all(),
        monthlySavings: db.select().from(monthlySavings).all(),
        monthlyDebts: db.select().from(monthlyDebts).all(),
        compoundSimulations: db.select().from(compoundSimulations).all(),
      },
    }

    const date = new Date().toISOString().slice(0, 10)
    c.header('Content-Disposition', `attachment; filename="finanzas-backup-${date}.json"`)
    return c.json(payload)
  })

  router.post('/import-json', async (c) => {
    const payload = await parseBody(c, backupSchema)
    const { data } = payload

    db.transaction((tx) => {
      // Borrado en orden inverso a las dependencias.
      tx.delete(expenseTransactions).run()
      tx.delete(monthlySavings).run()
      tx.delete(monthlyDebts).run()
      tx.delete(monthlyIncomes).run()
      tx.delete(monthlyBills).run()
      tx.delete(monthlyExpenseCategories).run()
      tx.delete(monthlyPeriods).run()
      tx.delete(annualGoals).run()
      tx.delete(catalogItems).run()
      tx.delete(compoundSimulations).run()
      tx.delete(years).run()
      tx.delete(settings).run()

      // Inserción respetando el orden de claves foráneas.
      if (data.settings.length > 0) tx.insert(settings).values(data.settings).run()
      if (data.years.length > 0) tx.insert(years).values(data.years).run()
      if (data.catalogItems.length > 0) {
        tx.insert(catalogItems).values(data.catalogItems).run()
      }
      if (data.annualGoals.length > 0) {
        tx.insert(annualGoals).values(data.annualGoals).run()
      }
      if (data.monthlyPeriods.length > 0) {
        tx.insert(monthlyPeriods).values(data.monthlyPeriods).run()
      }
      if (data.monthlyIncomes.length > 0) {
        tx.insert(monthlyIncomes).values(data.monthlyIncomes).run()
      }
      if (data.monthlyBills.length > 0) {
        tx.insert(monthlyBills).values(data.monthlyBills).run()
      }
      if (data.monthlyExpenseCategories.length > 0) {
        tx.insert(monthlyExpenseCategories).values(data.monthlyExpenseCategories).run()
      }
      if (data.monthlySavings.length > 0) {
        tx.insert(monthlySavings).values(data.monthlySavings).run()
      }
      if (data.monthlyDebts.length > 0) {
        tx.insert(monthlyDebts).values(data.monthlyDebts).run()
      }
      if (data.expenseTransactions.length > 0) {
        tx.insert(expenseTransactions).values(data.expenseTransactions).run()
      }
      if (data.compoundSimulations.length > 0) {
        tx.insert(compoundSimulations).values(data.compoundSimulations).run()
      }
    })

    return c.json({
      imported: true,
      exportedAt: payload.exportedAt,
      counts: {
        settings: data.settings.length,
        years: data.years.length,
        catalogItems: data.catalogItems.length,
        annualGoals: data.annualGoals.length,
        monthlyPeriods: data.monthlyPeriods.length,
        monthlyIncomes: data.monthlyIncomes.length,
        monthlyBills: data.monthlyBills.length,
        monthlyExpenseCategories: data.monthlyExpenseCategories.length,
        expenseTransactions: data.expenseTransactions.length,
        monthlySavings: data.monthlySavings.length,
        monthlyDebts: data.monthlyDebts.length,
        compoundSimulations: data.compoundSimulations.length,
      },
    })
  })

  router.post('/reset', async (c) => {
    await parseBody(c, resetDataSchema)

    db.transaction((tx) => {
      // Se elimina todo, incluida la configuración, para volver al estado inicial.
      tx.delete(expenseTransactions).run()
      tx.delete(monthlySavings).run()
      tx.delete(monthlyDebts).run()
      tx.delete(monthlyIncomes).run()
      tx.delete(monthlyBills).run()
      tx.delete(monthlyExpenseCategories).run()
      tx.delete(monthlyPeriods).run()
      tx.delete(annualGoals).run()
      tx.delete(catalogItems).run()
      tx.delete(compoundSimulations).run()
      tx.delete(years).run()
      tx.delete(settings).run()
    })

    const seeded = seedInitialData(db)
    if (!seeded) {
      return c.json({ error: 'No se pudo reinicializar la base de datos' }, 500)
    }

    return c.json({ reset: true })
  })

  router.get('/download-db', async (c) => {
    // Copia consistente usando la API de backup de better-sqlite3: incluye el
    // contenido del WAL y no requiere detener el servidor.
    const tempPath = path.join(
      os.tmpdir(),
      `finanzas-${Date.now()}-${Math.random().toString(16).slice(2)}.db`,
    )

    try {
      await sqlite.backup(tempPath)
      const bytes = await fs.promises.readFile(tempPath)
      const date = new Date().toISOString().slice(0, 10)

      c.header('Content-Type', 'application/vnd.sqlite3')
      c.header('Content-Disposition', `attachment; filename="finanzas-${date}.db"`)
      return c.body(new Uint8Array(bytes))
    } finally {
      await fs.promises.unlink(tempPath).catch(() => undefined)
    }
  })

  return router
}
