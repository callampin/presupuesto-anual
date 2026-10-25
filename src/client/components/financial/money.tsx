import { formatCurrency, type CurrencyConfig } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface MoneyProps {
  value: number
  config: CurrencyConfig
  className?: string
  mutedZero?: boolean
}

/** Monto formateado con `tabular-nums` y color atenuado cuando es cero. */
export function Money({ value, config, className, mutedZero = true }: MoneyProps) {
  return (
    <span
      className={cn(
        'tabular-nums',
        mutedZero && value === 0 && 'text-muted-foreground',
        className,
      )}
    >
      {formatCurrency(value, config)}
    </span>
  )
}
