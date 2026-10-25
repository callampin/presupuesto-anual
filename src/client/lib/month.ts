import type { MonthlySummary } from '@shared/types'

export type CascadeKey = 'bill' | 'expense' | 'saving' | 'debt'

/** Restante presupuesto/real después de restar un bloque (según la cascada). */
export function remainingAfter(
  summary: MonthlySummary,
  key: CascadeKey,
): { budget: number; actual: number } | undefined {
  const budget = summary.cascade.budget.find((step) => step.key === key)
  const actual = summary.cascade.actual.find((step) => step.key === key)
  if (!budget || !actual) return undefined
  return { budget: budget.remaining, actual: actual.remaining }
}
