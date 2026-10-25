import { afterEach, describe, expect, it } from 'vitest'
import { count, eq } from 'drizzle-orm'
import type { SQLiteTable } from 'drizzle-orm/sqlite-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  closeDatabase,
  getInitialYear,
  openDatabase,
  seedInitialData,
  type AppDatabase,
  type DatabaseConnection,
} from './db'
import {
  catalogItems,
  compoundSimulations,
  monthlyPeriods,
  settings,
  years,
} from '../shared/schema'

const tempDirs: string[] = []
const connections: DatabaseConnection[] = []

function createTempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'finanzas-test-'))
  tempDirs.push(dir)
  return path.join(dir, 'finanzas.db')
}

function openTestDatabase(databasePath?: string): DatabaseConnection {
  const connection = openDatabase(databasePath ?? createTempDbPath())
  connections.push(connection)
  return connection
}

function rowCount(db: AppDatabase, table: SQLiteTable): number {
  return db.select({ value: count() }).from(table).get()?.value ?? 0
}

afterEach(() => {
  for (const connection of connections.splice(0)) {
    if (connection.sqlite.open) connection.sqlite.close()
  }
  closeDatabase()
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('openDatabase (SQLite local)', () => {
  it('crea las 12 tablas del esquema al aplicar migraciones', () => {
    const connection = openTestDatabase()
    const tables = connection.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>

    const tableNames = tables
      .map((table) => table.name)
      .filter((name) => !name.startsWith('__'))
      .sort()
    expect(tableNames).toEqual(
      [
        'annual_goals',
        'catalog_items',
        'compound_simulations',
        'expense_transactions',
        'monthly_bills',
        'monthly_debts',
        'monthly_expense_categories',
        'monthly_incomes',
        'monthly_periods',
        'monthly_savings',
        'settings',
        'years',
      ].sort(),
    )
  })

  it('activa las claves foráneas', () => {
    const connection = openTestDatabase()
    expect(connection.sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('crea la carpeta de datos y el archivo SQLite cuando no existen', () => {
    const databasePath = createTempDbPath()
    expect(fs.existsSync(databasePath)).toBe(false)

    openTestDatabase(databasePath)

    expect(fs.existsSync(path.dirname(databasePath))).toBe(true)
    expect(fs.existsSync(databasePath)).toBe(true)
  })
})

describe('seed inicial (AGENTS.md §7)', () => {
  it('inserta configuración, catálogo, año, 12 periodos y simulación base', () => {
    const { db, seeded } = openTestDatabase()
    expect(seeded).toBe(true)

    const setting = db.select().from(settings).get()
    expect(setting).toMatchObject({
      id: 1,
      currencySymbol: '$',
      currencyCode: 'USD',
      locale: 'es-MX',
      decimalPlaces: 2,
      defaultYear: getInitialYear(),
    })

    const catalog = db.select().from(catalogItems).all()
    expect(catalog).toHaveLength(24)
    expect(catalog.filter((item) => item.section === 'income')).toHaveLength(4)
    expect(catalog.filter((item) => item.section === 'bill')).toHaveLength(8)
    expect(catalog.filter((item) => item.section === 'expense')).toHaveLength(12)
    expect(catalog.filter((item) => item.section === 'saving')).toHaveLength(0)
    expect(catalog.filter((item) => item.section === 'debt')).toHaveLength(0)
    expect(catalog.map((item) => item.name)).toContain('Despensa')
    expect(catalog.map((item) => item.name)).toContain('Salidas a comer')

    const yearRows = db.select().from(years).all()
    expect(yearRows).toHaveLength(1)
    expect(yearRows[0]).toMatchObject({
      year: getInitialYear(),
      goalsTitle: 'MIS METAS FINANCIERAS',
      notesTitle: 'NOTAS',
      notesContent: '',
    })

    const periods = db.select().from(monthlyPeriods).all()
    expect(periods).toHaveLength(12)
    expect(periods.map((period) => period.month).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    )
    expect(periods.every((period) => period.isInitialized === false)).toBe(true)

    const simulations = db.select().from(compoundSimulations).all()
    expect(simulations).toHaveLength(1)
    expect(simulations[0]).toMatchObject({
      name: 'Simulación inicial',
      initialCapital: 5000,
      monthlyRate: 0.06,
      months: 24,
      monthlyContribution: 0,
    })
    expect(JSON.parse(simulations[0]!.withdrawalsJson)).toEqual({ 12: 1000 })
  })

  it('es idempotente al reabrir la misma base (no duplica datos)', () => {
    const databasePath = createTempDbPath()

    const first = openTestDatabase(databasePath)
    expect(first.seeded).toBe(true)
    first.sqlite.close()

    const second = openTestDatabase(databasePath)
    expect(second.seeded).toBe(false)

    expect(rowCount(second.db, catalogItems)).toBe(24)
    expect(rowCount(second.db, years)).toBe(1)
    expect(rowCount(second.db, monthlyPeriods)).toBe(12)
    expect(rowCount(second.db, compoundSimulations)).toBe(1)
    expect(rowCount(second.db, settings)).toBe(1)
  })

  it('no vuelve a sembrar si ya existe la configuración', () => {
    const { db } = openTestDatabase()
    expect(seedInitialData(db)).toBe(false)
    expect(rowCount(db, catalogItems)).toBe(24)
  })

  it('propaga la eliminación en cascada del año a sus periodos', () => {
    const connection = openTestDatabase()
    const year = getInitialYear()

    connection.db.delete(years).where(eq(years.year, year)).run()

    expect(rowCount(connection.db, monthlyPeriods)).toBe(0)
  })

  it('funciona también con una base en memoria (para tests rápidos)', () => {
    const connection = openDatabase(':memory:')
    connections.push(connection)

    expect(connection.seeded).toBe(true)
    expect(rowCount(connection.db, catalogItems)).toBe(24)
  })
})
