/**
 * Seguimiento de deudas.
 *
 * La deuda se define en el catálogo maestro con un `total_amount` (monto total
 * a pagar) y sus abonos son los `actual_amount` de las filas mensuales de deuda
 * vinculadas a ese ítem del catálogo. El saldo pendiente se calcula como:
 *
 *   pendiente = total - suma(abonos)
 *
 * Cuando el pendiente llega a 0, la deuda se considera saldada y deja de
 * copiarse a meses nuevos. No se calculan intereses.
 */

import { asc, eq } from 'drizzle-orm'
import { roundMoney } from '../shared/calculations'
import { catalogItems, monthlyDebts } from '../shared/schema'
import type { AppDatabase } from './db'

export interface DebtAccountSummary {
  catalogItemId: number
  name: string
  /** Monto presupuestado mensual definido en el catálogo. */
  defaultAmount: number
  /** Monto total a pagar; `null` si aún no se definió. */
  totalAmount: number | null
  /** Suma de todos los abonos reales registrados. */
  paidAmount: number
  /** Saldo pendiente; `null` si no hay total definido. */
  remainingAmount: number | null
  isSettled: boolean
  isActive: boolean
}

/** Suma de abonos por ítem del catálogo de deudas. */
export function getDebtPaidTotals(db: AppDatabase): Map<number, number> {
  const rows = db
    .select({
      catalogItemId: monthlyDebts.catalogItemId,
      actualAmount: monthlyDebts.actualAmount,
    })
    .from(monthlyDebts)
    .all()

  const totals = new Map<number, number>()
  for (const row of rows) {
    if (row.catalogItemId === null) continue
    const amount = Number.isFinite(row.actualAmount) ? row.actualAmount : 0
    totals.set(row.catalogItemId, (totals.get(row.catalogItemId) ?? 0) + amount)
  }
  return totals
}

/** Estado consolidado de todas las deudas del catálogo. */
export function getDebtAccounts(db: AppDatabase): DebtAccountSummary[] {
  const paidTotals = getDebtPaidTotals(db)
  const items = db
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.section, 'debt'))
    .orderBy(asc(catalogItems.sortOrder), asc(catalogItems.id))
    .all()

  return items.map((item) => {
    const paidAmount = roundMoney(paidTotals.get(item.id) ?? 0)
    const totalAmount = item.totalAmount
    const remainingAmount =
      totalAmount === null ? null : roundMoney(Math.max(0, totalAmount - paidAmount))

    return {
      catalogItemId: item.id,
      name: item.name,
      defaultAmount: item.defaultAmount,
      totalAmount,
      paidAmount,
      remainingAmount,
      isSettled: totalAmount !== null && paidAmount >= totalAmount,
      isActive: item.isActive,
    }
  })
}

/** IDs de deudas totalmente pagadas (no deben copiarse a meses nuevos). */
export function getSettledDebtIds(db: AppDatabase): Set<number> {
  return new Set(
    getDebtAccounts(db)
      .filter((account) => account.isSettled)
      .map((account) => account.catalogItemId),
  )
}
