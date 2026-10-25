/**
 * Conexión SQLite local, migraciones automáticas y seed inicial.
 *
 * Decisiones (AGENTS.md §3.1 y §7):
 *  - La base vive en `./data/finanzas.db` (configurable con `DATABASE_PATH`).
 *  - Las migraciones versionadas (`./drizzle`) se aplican automáticamente al
 *    abrir la base, por lo que no hace falta ningún paso manual.
 *  - El seed corre una única vez (BD vacía) e inserta el catálogo original del
 *    Excel, el año actual con sus 12 periodos y la simulación base de interés
 *    compuesto.
 *  - `PRAGMA foreign_keys = ON` para que las cascadas funcionen de verdad.
 */

import Database from 'better-sqlite3'
import { count } from 'drizzle-orm'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from '../shared/schema'
import {
  catalogItems,
  compoundSimulations,
  monthlyPeriods,
  settings,
  years,
  type CatalogSection,
} from '../shared/schema'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '../..')

/** Carpeta de migraciones versionadas generadas con `drizzle-kit generate`. */
export const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  ? path.resolve(process.env.MIGRATIONS_DIR)
  : path.join(projectRoot, 'drizzle')

/** Carpeta de datos local (se crea automáticamente). */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(projectRoot, 'data')

/** Ruta absoluta del archivo SQLite. */
export const DEFAULT_DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DATA_DIR, 'finanzas.db')

export type AppDatabase = BetterSQLite3Database<typeof schema>

export interface DatabaseConnection {
  db: AppDatabase
  sqlite: Database.Database
  /** Ruta absoluta del archivo abierto (o `:memory:`). */
  path: string
  /** `true` si el seed se ejecutó en esta apertura. */
  seeded: boolean
}

/** Catálogo original de `PRESUPUESTO.xlsx` (AGENTS.md §7). */
const DEFAULT_CATALOG: Array<{ section: CatalogSection; name: string }> = [
  { section: 'income', name: 'Quincena 1' },
  { section: 'income', name: 'Quincena 2' },
  { section: 'income', name: 'Negocio por internet' },
  { section: 'income', name: 'Rendimientos inversión' },
  { section: 'bill', name: 'Renta' },
  { section: 'bill', name: 'Agua' },
  { section: 'bill', name: 'Gas' },
  { section: 'bill', name: 'Luz' },
  { section: 'bill', name: 'Jardinero' },
  { section: 'bill', name: 'Internet' },
  { section: 'bill', name: 'Teléfono' },
  { section: 'bill', name: 'Colegiatura' },
  { section: 'expense', name: 'Despensa' },
  { section: 'expense', name: 'Salidas a comer' },
  { section: 'expense', name: 'Compras' },
  { section: 'expense', name: 'Salón' },
  { section: 'expense', name: 'Regalos' },
  { section: 'expense', name: 'Transporte' },
  { section: 'expense', name: 'Gastos del hogar' },
  { section: 'expense', name: 'Salud' },
  { section: 'expense', name: 'Cuidado personal' },
  { section: 'expense', name: 'Entretenimiento' },
  { section: 'expense', name: 'Limpieza' },
  { section: 'expense', name: 'Academia' },
]

/** Año fiscal con el que arranca la aplicación la primera vez. */
export function getInitialYear(now: Date = new Date()): number {
  return now.getFullYear()
}

/**
 * Inserta los datos iniciales si la base está vacía.
 * Es idempotente: si ya existe la fila de `settings`, no hace nada.
 *
 * @returns `true` si insertó el seed, `false` si ya había datos.
 */
export function seedInitialData(db: AppDatabase, now: Date = new Date()): boolean {
  const existing = db.select({ id: settings.id }).from(settings).limit(1).get()
  if (existing) return false

  const year = getInitialYear(now)
  const sectionCounters = new Map<CatalogSection, number>()
  const catalogRows = DEFAULT_CATALOG.map((item) => {
    const nextOrder = sectionCounters.get(item.section) ?? 0
    sectionCounters.set(item.section, nextOrder + 1)
    return {
      section: item.section,
      name: item.name,
      defaultAmount: 0,
      defaultDayOfMonth: null,
      sortOrder: nextOrder,
      isActive: true,
    }
  })

  db.transaction((tx) => {
    tx.insert(settings)
      .values({
        id: 1,
        currencySymbol: '$',
        currencyCode: 'USD',
        locale: 'es-MX',
        decimalPlaces: 2,
        defaultYear: year,
      })
      .run()

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

    tx.insert(catalogItems).values(catalogRows).run()

    tx.insert(compoundSimulations)
      .values({
        name: 'Simulación inicial',
        initialCapital: 5000,
        monthlyRate: 0.06,
        months: 24,
        monthlyContribution: 0,
        withdrawalsJson: JSON.stringify({ 12: 1000 }),
      })
      .run()
  })

  return true
}

export interface OpenDatabaseOptions {
  /** Carpeta de migraciones versionadas. En Electron apunta a `resources/migrations`. */
  migrationsDir?: string
}

/**
 * Abre (o crea) la base SQLite, aplica migraciones pendientes y ejecuta el
 * seed si corresponde.
 *
 * `migrationsDir` permite que la app empaquetada lea los SQL desde
 * `process.resourcesPath` en lugar de la carpeta del proyecto.
 */
export function openDatabase(
  databasePath: string = DEFAULT_DB_PATH,
  options: OpenDatabaseOptions = {},
): DatabaseConnection {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true })
  }

  const sqlite = new Database(databasePath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  migrate(db, { migrationsFolder: options.migrationsDir ?? MIGRATIONS_DIR })

  const seeded = seedInitialData(db)

  return { db, sqlite, path: databasePath, seeded }
}

let currentConnection: DatabaseConnection | null = null

/** Conexión singleton usada por el servidor local. */
export function getDatabase(): DatabaseConnection {
  if (!currentConnection) {
    currentConnection = openDatabase(DEFAULT_DB_PATH)
  }
  return currentConnection
}

/** Cierra la conexión singleton (usado al apagar el servidor y en tests). */
export function closeDatabase(): void {
  if (currentConnection) {
    currentConnection.sqlite.close()
    currentConnection = null
  }
}

/** Conteo rápido de filas, útil para `/api/health` y diagnósticos. */
export function getDatabaseStatus(db: AppDatabase, databasePath: string = DEFAULT_DB_PATH) {
  const setting = db.select().from(settings).limit(1).get()
  const catalog = db.select({ value: count() }).from(catalogItems).get()
  const yearCount = db.select({ value: count() }).from(years).get()
  const periodCount = db.select({ value: count() }).from(monthlyPeriods).get()

  return {
    path: databasePath,
    currency: setting?.currencyCode ?? null,
    defaultYear: setting?.defaultYear ?? null,
    catalogItems: catalog?.value ?? 0,
    years: yearCount?.value ?? 0,
    monthlyPeriods: periodCount?.value ?? 0,
  }
}
