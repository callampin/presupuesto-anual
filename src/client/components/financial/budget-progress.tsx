import { Progress } from '@/components/ui/progress'
import { budgetHealth, formatCurrency, formatPercent, type CurrencyConfig } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface BudgetProgressProps {
  budget: number
  actual: number
  config: CurrencyConfig
  className?: string
  showAmounts?: boolean
}

const HEALTH_STYLES = {
  ok: { bar: 'bg-income', text: 'text-income' },
  warning: { bar: 'bg-expenses', text: 'text-expenses' },
  over: { bar: 'bg-destructive', text: 'text-destructive' },
} as const

/**
 * Consumo de presupuesto con barra y porcentaje.
 * Semáforo: <85% verde, 85–100% ámbar, >100% rojo (AGENTS.md §5.1).
 */
export function BudgetProgress({
  budget,
  actual,
  config,
  className,
  showAmounts = true,
}: BudgetProgressProps) {
  const health = budgetHealth(budget, actual)
  const styles = HEALTH_STYLES[health]
  const ratio = budget > 0 ? actual / budget : actual > 0 ? 1 : 0
  const percent = `${formatPercent(ratio)}`

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        {showAmounts ? (
          <span className="tabular-nums text-muted-foreground">
            {formatCurrency(actual, config)}
            <span className="mx-1 text-border">/</span>
            {formatCurrency(budget, config)}
          </span>
        ) : (
          <span />
        )}
        <span className={cn('font-medium tabular-nums', styles.text)}>{percent}</span>
      </div>
      <Progress value={ratio * 100} indicatorClassName={styles.bar} aria-label={`Consumo ${percent}`} />
    </div>
  )
}
