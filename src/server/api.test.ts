import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from './app'
import {
  closeDatabase,
  getInitialYear,
  openDatabase,
  type DatabaseConnection,
} from './db'

let connection: DatabaseConnection
let app: ReturnType<typeof createApp>
let tempDir: string

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finanzas-api-'))
  connection = openDatabase(path.join(tempDir, 'test.db'))
  app = createApp(connection)
})

afterEach(() => {
  if (connection.sqlite.open) connection.sqlite.close()
  closeDatabase()
  fs.rmSync(tempDir, { recursive: true, force: true })
})

const jsonHeaders = { 'content-type': 'application/json' }

async function request(pathname: string, init?: RequestInit) {
  const response = await app.request(pathname, init)
  const text = await response.text()
  const body = text.length > 0 ? JSON.parse(text) : null
  return { response, body }
}

function post(pathname: string, body: unknown) {
  return request(pathname, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
}

function put(pathname: string, body: unknown) {
  return request(pathname, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
}

function del(pathname: string) {
  return request(pathname, { method: 'DELETE' })
}

describe('GET /api/health', () => {
  it('reporta el estado de la base y el catálogo sembrado', async () => {
    const { response, body } = await request('/api/health')

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      status: 'ok',
      stage: 3,
      database: 'ready',
      currency: 'USD',
      catalogItems: 24,
      years: 1,
      monthlyPeriods: 12,
    })
  })
})

describe('/api/not-found', () => {
  it('responde JSON 404 para rutas de API desconocidas', async () => {
    const { response, body } = await request('/api/no-existe')
    expect(response.status).toBe(404)
    expect(body.error).toBeTruthy()
  })
})

describe('/api/settings', () => {
  it('lee y actualiza la configuración global', async () => {
    const initial = await request('/api/settings')
    expect(initial.body.currencyCode).toBe('USD')

    const updated = await put('/api/settings', {
      currencySymbol: 'S/',
      currencyCode: 'PEN',
      decimalPlaces: 2,
    })
    expect(updated.response.status).toBe(200)
    expect(updated.body).toMatchObject({ currencySymbol: 'S/', currencyCode: 'PEN' })

    const reread = await request('/api/settings')
    expect(reread.body.currencyCode).toBe('PEN')
  })

  it('rechaza un cuerpo vacío o inválido', async () => {
    const empty = await put('/api/settings', {})
    expect(empty.response.status).toBe(422)

    const invalid = await put('/api/settings', { decimalPlaces: 99 })
    expect(invalid.response.status).toBe(422)
    expect(invalid.body.issues).toBeInstanceOf(Array)
  })
})

describe('/api/catalog', () => {
  it('lista por sección y rechaza secciones inválidas', async () => {
    const income = await request('/api/catalog?section=income')
    expect(income.body).toHaveLength(4)
    expect(income.body[0].name).toBe('Quincena 1')

    const invalid = await request('/api/catalog?section=nope')
    expect(invalid.response.status).toBe(400)
  })

  it('crea, edita, reordena y elimina ítems', async () => {
    const created = await post('/api/catalog', { section: 'expense', name: 'Mascotas' })
    expect(created.response.status).toBe(201)
    expect(created.body.sortOrder).toBe(12)

    const renamed = await put(`/api/catalog/${created.body.id}`, { name: 'Mascotas y vet' })
    expect(renamed.body.name).toBe('Mascotas y vet')

    const sectionChange = await put(`/api/catalog/${created.body.id}`, { section: 'income' })
    expect(sectionChange.response.status).toBe(422)

    const income = await request('/api/catalog?section=income')
    const reversedIds = income.body.map((item: { id: number }) => item.id).reverse()
    const reordered = await put('/api/catalog/reorder', {
      section: 'income',
      ids: reversedIds,
    })
    expect(reordered.response.status).toBe(200)
    expect(reordered.body.map((item: { id: number }) => item.id)).toEqual(reversedIds)

    const deleted = await del(`/api/catalog/${created.body.id}`)
    expect(deleted.response.status).toBe(200)

    const expenses = await request('/api/catalog?section=expense')
    expect(expenses.body).toHaveLength(12)
  })

  it('valida el nombre al crear', async () => {
    const { response } = await post('/api/catalog', { section: 'expense', name: '' })
    expect(response.status).toBe(422)
  })
})

describe('/api/years', () => {
  it('crea años nuevos con sus 12 periodos y evita duplicados', async () => {
    const currentYear = getInitialYear()
    const list = await request('/api/years')
    expect(list.body.map((row: { year: number }) => row.year)).toContain(currentYear)

    const created = await post('/api/years', { year: 2027 })
    expect(created.response.status).toBe(201)
    expect(created.body.year).toBe(2027)

    const duplicate = await post('/api/years', { year: 2027 })
    expect(duplicate.response.status).toBe(409)

    const detail = await request('/api/years/2027')
    expect(detail.body.goals).toEqual([])
  })

  it('actualiza títulos y notas del año', async () => {
    await post('/api/years', { year: 2027 })
    const updated = await put('/api/years/2027', {
      goalsTitle: 'Metas 2027',
      notesTitle: 'Notas 2027',
      notesContent: 'Decreto poderoso',
    })
    expect(updated.response.status).toBe(200)
    expect(updated.body).toMatchObject({
      goalsTitle: 'Metas 2027',
      notesTitle: 'Notas 2027',
      notesContent: 'Decreto poderoso',
    })
  })

  it('gestiona metas financieras', async () => {
    await post('/api/years', { year: 2027 })
    const created = await post('/api/years/2027/goals', {
      description: 'Fondo de emergencia',
      targetAmount: 10000,
    })
    expect(created.response.status).toBe(201)

    const completed = await put(`/api/years/2027/goals/${created.body.id}`, {
      isCompleted: true,
    })
    expect(completed.body.isCompleted).toBe(true)

    const deleted = await del(`/api/years/2027/goals/${created.body.id}`)
    expect(deleted.response.status).toBe(200)

    const goals = await request('/api/years/2027/goals')
    expect(goals.body).toHaveLength(0)
  })

  it('devuelve el consolidado anual con 12 filas por tabla', async () => {
    await post('/api/years', { year: 2027 })
    const { response, body } = await request('/api/years/2027/summary')

    expect(response.status).toBe(200)
    expect(body.initializedMonths).toEqual([])
    expect(body.summary.kpis).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      remaining: 0,
      totalSavings: 0,
    })
    expect(body.summary.tables.income.rows).toHaveLength(12)
    expect(body.summary.tables.debts.rows).toHaveLength(12)
    expect(body.summary.series.income).toHaveLength(12)
  })

  it('elimina un año con todos sus datos y limpia el año por defecto', async () => {
    await post('/api/years', { year: 2027 })
    await post('/api/months/2027/1/initialize', { source: 'catalog' })
    await put('/api/settings', { defaultYear: 2027 })

    const deleted = await del('/api/years/2027')
    expect(deleted.response.status).toBe(200)
    expect(deleted.body).toEqual({ deleted: true, year: 2027 })

    const list = await request('/api/years')
    expect(list.body.some((row: { year: number }) => row.year === 2027)).toBe(false)
    expect((await request('/api/months/2027/1')).response.status).toBe(404)
    expect((await request('/api/settings')).body.defaultYear).toBeNull()
  })

  it('no permite eliminar el único año fiscal', async () => {
    const { response, body } = await del(`/api/years/${getInitialYear()}`)

    expect(response.status).toBe(409)
    expect(body.error).toContain('único')
  })

  it('responde 404 al intentar eliminar un año inexistente', async () => {
    const { response } = await del('/api/years/1999')
    expect(response.status).toBe(404)
  })

  it('responde 404 para un año inexistente', async () => {
    const { response } = await request('/api/years/1999/summary')
    expect(response.status).toBe(404)
  })
})

describe('/api/months', () => {
  beforeEach(async () => {
    const created = await post('/api/years', { year: 2027 })
    expect(created.response.status).toBe(201)
  })

  it('inicializa un mes desde el catálogo y calcula la cascada', async () => {
    const init = await post('/api/months/2027/1/initialize', { source: 'catalog' })
    expect(init.response.status).toBe(201)
    expect(init.body.period.isInitialized).toBe(true)
    expect(init.body.incomes).toHaveLength(4)
    expect(init.body.bills).toHaveLength(8)
    expect(init.body.expenseCategories).toHaveLength(12)
    expect(init.body.savings).toHaveLength(0)
    expect(init.body.debts).toHaveLength(0)
    expect(init.body.summary.cascade.finalBudget).toBe(0)

    const again = await post('/api/months/2027/1/initialize', { source: 'catalog' })
    expect(again.response.status).toBe(409)
  })

  it('registra ingresos, facturas y transacciones, y recalcula el gasto real', async () => {
    const init = await post('/api/months/2027/1/initialize', { source: 'catalog' })
    const categoryId = init.body.expenseCategories[0].id

    const income = await post('/api/months/2027/1/incomes', {
      name: 'Extra',
      expectedAmount: 500,
      actualAmount: 400,
    })
    expect(income.response.status).toBe(201)

    const bill = await post('/api/months/2027/1/bills', {
      name: 'Renta',
      dueDate: '2027-01-05',
      isPaid: true,
      budgetAmount: 100,
      actualAmount: 90,
    })
    expect(bill.response.status).toBe(201)

    const transaction = await post('/api/months/2027/1/transactions', {
      expenseCategoryId: categoryId,
      amount: 40,
      date: '2027-01-10',
      notes: 'Prueba',
    })
    expect(transaction.response.status).toBe(201)

    const month = await request('/api/months/2027/1')
    const category = month.body.expenseCategories.find(
      (row: { id: number }) => row.id === categoryId,
    )
    expect(category.actualAmount).toBe(40)
    expect(month.body.summary.totals.expenses.actual).toBe(40)
    expect(month.body.summary.cascade.finalActual).toBe(400 - 90 - 40)

    const unpaid = await put(`/api/months/2027/1/bills/${bill.body.id}`, { isPaid: false })
    expect(unpaid.body.isPaid).toBe(false)
  })

  it('copia el mes anterior desplazando fechas y limpiando valores reales', async () => {
    await post('/api/months/2027/1/initialize', { source: 'catalog' })
    const january = await request('/api/months/2027/1')

    // Se agrega una transacción en enero: no debe copiarse a febrero.
    await post('/api/months/2027/1/transactions', {
      expenseCategoryId: january.body.expenseCategories[0].id,
      amount: 25,
    })
    await put(`/api/months/2027/1/bills/${january.body.bills[0].id}`, {
      isPaid: true,
      actualAmount: 120,
      dueDate: '2027-01-31',
    })

    const february = await post('/api/months/2027/2/initialize', { source: 'previous' })
    expect(february.response.status).toBe(201)
    expect(february.body.incomes).toHaveLength(4)
    expect(february.body.transactions).toHaveLength(0)
    expect(february.body.summary.totals.expenses.actual).toBe(0)
    expect(february.body.bills.every((bill: { isPaid: boolean }) => bill.isPaid === false)).toBe(
      true,
    )
    expect(february.body.bills[0].dueDate).toBe('2027-02-28')
    expect(february.body.incomes.every((income: { actualAmount: number }) => income.actualAmount === 0)).toBe(
      true,
    )
  })

  it('permite empezar un mes en blanco', async () => {
    const blank = await post('/api/months/2027/3/initialize', { source: 'blank' })
    expect(blank.response.status).toBe(201)
    expect(blank.body.incomes).toHaveLength(0)
    expect(blank.body.period.isInitialized).toBe(true)
  })

  it('rechaza transacciones cuya categoría pertenece a otro mes', async () => {
    const january = await post('/api/months/2027/1/initialize', { source: 'catalog' })
    await post('/api/months/2027/2/initialize', { source: 'catalog' })

    const wrong = await post('/api/months/2027/2/transactions', {
      expenseCategoryId: january.body.expenseCategories[0].id,
      amount: 10,
    })
    expect(wrong.response.status).toBe(422)
  })

  it('elimina filas de los bloques y valida pertenencia al mes', async () => {
    const init = await post('/api/months/2027/1/initialize', { source: 'catalog' })
    const incomeId = init.body.incomes[0].id

    const deleted = await del(`/api/months/2027/1/incomes/${incomeId}`)
    expect(deleted.response.status).toBe(200)

    const month = await request('/api/months/2027/1')
    expect(month.body.incomes).toHaveLength(3)

    const wrongMonth = await del(`/api/months/2027/2/incomes/${incomeId}`)
    expect(wrongMonth.response.status).toBe(404)
  })

  it('responde 404 si el mes no existe', async () => {
    const { response } = await request('/api/months/1999/1')
    expect(response.status).toBe(404)
  })
})

describe('seguimiento de deudas', () => {
  it('calcula saldo, marca saldada y deja de copiarla a meses nuevos', async () => {
    const year = getInitialYear()
    const created = await post('/api/catalog', {
      section: 'debt',
      name: 'Tarjeta',
      defaultAmount: 200,
      totalAmount: 1000,
    })
    expect(created.response.status).toBe(201)
    const debtId = created.body.id

    const januaryInit = await post(`/api/months/${year}/1/initialize`, { source: 'catalog' })
    expect(januaryInit.response.status).toBe(201)

    const januaryDebt = januaryInit.body.debts.find(
      (row: { catalogItemId: number }) => row.catalogItemId === debtId,
    )
    expect(januaryDebt).toMatchObject({
      totalAmount: 1000,
      paidAmount: 0,
      remainingAmount: 1000,
      isSettled: false,
    })

    await put(`/api/months/${year}/1/debts/${januaryDebt.id}`, { actualAmount: 400 })
    const january = await request(`/api/months/${year}/1`)
    expect(
      january.body.debts.find((row: { catalogItemId: number }) => row.catalogItemId === debtId),
    ).toMatchObject({ paidAmount: 400, remainingAmount: 600, isSettled: false })

    const februaryInit = await post(`/api/months/${year}/2/initialize`, {
      source: 'previous',
    })
    const februaryDebt = februaryInit.body.debts.find(
      (row: { catalogItemId: number }) => row.catalogItemId === debtId,
    )
    expect(februaryDebt).toMatchObject({
      paidAmount: 400,
      remainingAmount: 600,
      isSettled: false,
    })

    await put(`/api/months/${year}/2/debts/${februaryDebt.id}`, { actualAmount: 600 })
    const february = await request(`/api/months/${year}/2`)
    expect(
      february.body.debts.find((row: { catalogItemId: number }) => row.catalogItemId === debtId),
    ).toMatchObject({ paidAmount: 1000, remainingAmount: 0, isSettled: true })
    expect(
      february.body.debtAccounts.find(
        (account: { catalogItemId: number }) => account.catalogItemId === debtId,
      ),
    ).toMatchObject({
      totalAmount: 1000,
      paidAmount: 1000,
      remainingAmount: 0,
      isSettled: true,
    })

    const march = await post(`/api/months/${year}/3/initialize`, { source: 'previous' })
    expect(
      march.body.debts.some((row: { catalogItemId: number }) => row.catalogItemId === debtId),
    ).toBe(false)
    expect(
      march.body.debtAccounts.find(
        (account: { catalogItemId: number }) => account.catalogItemId === debtId,
      ).isSettled,
    ).toBe(true)

    const april = await post(`/api/months/${year}/4/initialize`, { source: 'catalog' })
    expect(
      april.body.debts.some((row: { catalogItemId: number }) => row.catalogItemId === debtId),
    ).toBe(false)
  })

  it('mantiene las deudas sin monto total como no rastreadas', async () => {
    const year = getInitialYear()
    const created = await post('/api/catalog', {
      section: 'debt',
      name: 'Sin total',
      defaultAmount: 100,
    })
    const debtId = created.body.id

    const januaryInit = await post(`/api/months/${year}/1/initialize`, { source: 'catalog' })
    const row = januaryInit.body.debts.find(
      (debt: { catalogItemId: number }) => debt.catalogItemId === debtId,
    )
    expect(row).toMatchObject({
      totalAmount: null,
      paidAmount: 0,
      remainingAmount: null,
      isSettled: false,
    })

    await put(`/api/months/${year}/1/debts/${row.id}`, { actualAmount: 100 })

    const februaryInit = await post(`/api/months/${year}/2/initialize`, {
      source: 'previous',
    })
    expect(
      februaryInit.body.debts.some(
        (debt: { catalogItemId: number }) => debt.catalogItemId === debtId,
      ),
    ).toBe(true)
  })

  it('rechaza un total negativo', async () => {
    const invalid = await post('/api/catalog', {
      section: 'debt',
      name: 'Negativa',
      totalAmount: -1,
    })
    expect(invalid.response.status).toBe(422)
  })

  it('permite vincular una fila mensual a una deuda del catálogo', async () => {
    const year = getInitialYear()
    const catalogDebt = await post('/api/catalog', {
      section: 'debt',
      name: 'Vinculada',
      totalAmount: 2000,
    })
    const blank = await post(`/api/months/${year}/5/initialize`, { source: 'blank' })
    expect(blank.response.status).toBe(201)

    const row = await post(`/api/months/${year}/5/debts`, {
      name: 'Vinculada',
      catalogItemId: catalogDebt.body.id,
      expectedAmount: 200,
      actualAmount: 300,
    })
    expect(row.response.status).toBe(201)

    const payload = await request(`/api/months/${year}/5`)
    expect(payload.body.debts[0]).toMatchObject({
      totalAmount: 2000,
      paidAmount: 300,
      remainingAmount: 1700,
      isSettled: false,
    })

    const invalid = await post(`/api/months/${year}/5/debts`, {
      name: 'Otra',
      catalogItemId: 999999,
    })
    expect(invalid.response.status).toBe(422)
  })
})

describe('/api/simulations', () => {  it('lista el escenario semilla y permite CRUD completo', async () => {
    const list = await request('/api/simulations')
    expect(list.body).toHaveLength(1)
    expect(list.body[0]).toMatchObject({ name: 'Simulación inicial', months: 24 })
    expect(list.body[0].withdrawals).toEqual({ 12: 1000 })

    const created = await post('/api/simulations', {
      name: 'Retiro largo',
      initialCapital: 10000,
      monthlyRate: 0.05,
      months: 60,
      monthlyContribution: 200,
      withdrawals: { 24: 500 },
    })
    expect(created.response.status).toBe(201)
    expect(created.body.withdrawals).toEqual({ 24: 500 })

    const updated = await put(`/api/simulations/${created.body.id}`, {
      months: 72,
      withdrawals: { 48: 1000 },
    })
    expect(updated.body.months).toBe(72)
    expect(updated.body.withdrawals).toEqual({ 48: 1000 })

    const fetched = await request(`/api/simulations/${created.body.id}`)
    expect(fetched.body.name).toBe('Retiro largo')

    const deleted = await del(`/api/simulations/${created.body.id}`)
    expect(deleted.response.status).toBe(200)

    const missing = await request(`/api/simulations/${created.body.id}`)
    expect(missing.response.status).toBe(404)
  })
})

describe('/api/backup', () => {
  it('exporta, importa y restaura un respaldo JSON', async () => {
    const exported = await request('/api/backup/export-json')
    expect(exported.response.status).toBe(200)
    expect(exported.body.app).toBe('presupuesto-personal')
    expect(exported.body.data.catalogItems).toHaveLength(24)

    // Modificación posterior que debe desaparecer al restaurar.
    await post('/api/catalog', { section: 'expense', name: 'Temporal' })
    const afterChange = await request('/api/catalog')
    expect(afterChange.body).toHaveLength(25)

    const imported = await post('/api/backup/import-json', exported.body)
    expect(imported.response.status).toBe(200)
    expect(imported.body.counts.catalogItems).toBe(24)

    const restored = await request('/api/catalog')
    expect(restored.body).toHaveLength(24)
    expect(
      restored.body.some((item: { name: string }) => item.name === 'Temporal'),
    ).toBe(false)
  })

  it('rechaza un respaldo inválido sin tocar los datos', async () => {
    const invalid = await post('/api/backup/import-json', { foo: 'bar' })
    expect(invalid.response.status).toBe(422)

    const catalog = await request('/api/catalog')
    expect(catalog.body).toHaveLength(24)
  })

  it('borra todos los datos y restaura el estado inicial', async () => {
    const year = getInitialYear()
    await post('/api/catalog', { section: 'expense', name: 'Temporal' })
    await post(`/api/months/${year}/1/initialize`, { source: 'catalog' })
    await put('/api/settings', {
      currencyCode: 'PEN',
      currencySymbol: 'S/',
      defaultYear: 2027,
    })
    await post('/api/years', { year: 2027 })

    const wrong = await post('/api/backup/reset', { confirmation: 'NO' })
    expect(wrong.response.status).toBe(422)
    expect((await request('/api/catalog')).body).toHaveLength(25)

    const reset = await post('/api/backup/reset', { confirmation: 'ELIMINAR' })
    expect(reset.response.status).toBe(200)
    expect(reset.body).toEqual({ reset: true })

    const settings = await request('/api/settings')
    expect(settings.body).toMatchObject({
      currencyCode: 'USD',
      currencySymbol: '$',
      defaultYear: year,
    })

    const years = await request('/api/years')
    expect(years.body.map((row: { year: number }) => row.year)).toEqual([year])

    const catalog = await request('/api/catalog')
    expect(catalog.body).toHaveLength(24)
    expect(
      catalog.body.some((row: { name: string }) => row.name === 'Temporal'),
    ).toBe(false)

    const month = await request(`/api/months/${year}/1`)
    expect(month.body.period.isInitialized).toBe(false)
    expect(month.body.incomes).toHaveLength(0)

    const simulations = await request('/api/simulations')
    expect(simulations.body).toHaveLength(1)
  })

  it('descarga una copia consistente de la base SQLite', async () => {
    const response = await app.request('/api/backup/download-db')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/vnd.sqlite3')

    const bytes = new Uint8Array(await response.arrayBuffer())
    const header = new TextDecoder().decode(bytes.slice(0, 15))
    expect(header).toBe('SQLite format 3')
  })
})
