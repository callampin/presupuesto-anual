import { Card } from '@/components/ui/card'
import { formatCurrency, type CurrencyConfig } from '@/lib/format'
import type { MonthlySummary } from '@shared/types'
import { cn } from '@/lib/utils'

export interface CascadeSummaryProps {
  summary: MonthlySummary
  config: CurrencyConfig
}

const ORDER = ['bill', 'expense', 'saving', 'debt'] as const
const SPECTRAL = ['bg-income', 'bg-bills', 'bg-expenses', 'bg-savings', 'bg-debt', 'bg-primary']

interface CardData {
  key: string
  label: string
  total: { budget: number; actual: number } | null
  remaining: { budget: number; actual: number }
  final?: boolean
}

/**
 * Cascada del mes como una escala de medición: una línea continua, seis marcas
 * y dos lecturas por tramo (presupuesto en gris, real en tinta).
 */
export function CascadeSummary({ summary, config }: CascadeSummaryProps) {
  const { totals, cascade } = summary

  const cards: CardData[] = [
    {
      key: 'income',
      label: 'Ingreso',
      total: null,
      remaining: { budget: totals.income.budget, actual: totals.income.actual },
    },
  ]

  for (const key of ORDER) {
    const budgetStep = cascade.budget.find((step) => step.key === key)
    const actualStep = cascade.actual.find((step) => step.key === key)
    if (!budgetStep || !actualStep) continue
    cards.push({
      key,
      label: budgetStep.label,
      total: { budget: budgetStep.total, actual: actualStep.total },
      remaining: { budget: budgetStep.remaining, actual: actualStep.remaining },
    })
  }

  cards.push({
    key: 'final',
    label: 'Por asignar',
    total: null,
    remaining: { budget: cascade.finalBudget, actual: cascade.finalActual },
    final: true,
  })

  const finalValue = cascade.finalActual
  const finalTone =
    finalValue < 0 ? 'text-debt' : finalValue === 0 ? 'text-income' : 'text-primary'
  const finalLabel =
    finalValue < 0 ? 'Sobregiro' : finalValue === 0 ? 'Base cero' : 'Sin asignar'

  return (
    <Card className="plot-panel overflow-hidden p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/70 px-4 py-3">
        <h3 className="label-caps text-foreground">Cascada del mes</h3>
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
          Ingreso − facturas − gastos − ahorros − deuda
        </span>
      </div>

      <div className="lg:overflow-x-auto">
        <div className="relative flex flex-col lg:min-w-[860px] lg:flex-row">
          <div className="absolute inset-y-0 left-3 w-px bg-border lg:hidden" aria-hidden="true" />
          <div
            className="rail-draw absolute inset-x-0 top-0 hidden h-px bg-border lg:block"
            aria-hidden="true"
          />

          {cards.map((card, index) => {
            const isFinal = card.final === true
            return (
              <div
                key={card.key}
                className={cn(
                  'relative border-b border-border/60 px-4 py-4 pl-8 last:border-b-0',
                  'lg:min-w-0 lg:flex-1 lg:border-b-0 lg:border-l lg:py-5 lg:pl-4 lg:first:border-l-0',
                  isFinal && 'bg-primary/[0.035]',
                )}
              >
                <span
                  className={cn(
                    'absolute left-3 top-6 h-2 w-2 -translate-x-1/2 rounded-full border border-border bg-background lg:hidden',
                    isFinal && 'border-primary bg-primary',
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    'absolute -top-px left-0 hidden h-2 w-px lg:block',
                    isFinal ? 'bg-primary' : 'bg-muted-foreground/40',
                  )}
                  aria-hidden="true"
                />

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] tabular-nums text-muted-foreground/70">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[9px] uppercase tracking-[0.16em]',
                      isFinal ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {card.label}
                  </span>
                  {isFinal ? (
                    <span
                      className={cn(
                        'ml-auto font-mono text-[8px] uppercase tracking-[0.1em] lg:hidden',
                        finalTone,
                      )}
                    >
                      {finalLabel}
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {card.total
                    ? `− ${formatCurrency(card.total.actual, config)}`
                    : 'Total del mes'}
                </p>

                <p
                  className={cn(
                    'value-num mt-1 text-[1.35rem] leading-none',
                    isFinal ? finalTone : 'text-foreground',
                  )}
                >
                  {formatCurrency(card.remaining.actual, config)}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn('h-px w-8', SPECTRAL[index] ?? 'bg-border')}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                    pres. {formatCurrency(card.remaining.budget, config)}
                  </span>
                </div>

                {isFinal ? (
                  <p
                    className={cn(
                      'mt-2 hidden font-mono text-[9px] uppercase tracking-[0.1em] lg:block',
                      finalTone,
                    )}
                  >
                    {finalLabel}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
