import { formatCurrency, type CurrencyConfig } from '@/lib/format'
import { cn } from '@/lib/utils'

const RULES = {
  income: 'bg-income',
  bills: 'bg-bills',
  expenses: 'bg-expenses',
  savings: 'bg-savings',
  debt: 'bg-debt',
  primary: 'bg-primary',
} as const

export interface KpiCardProps {
  label: string
  value: number
  config: CurrencyConfig
  accent: keyof typeof RULES
  hint?: string
  className?: string
}

/** Lectura de un indicador: cifra, regla espectral y contexto. Sin tarjeta propia. */
export function KpiCard({ label, value, config, accent, hint, className }: KpiCardProps) {
  return (
    <div className={cn('min-w-0 bg-card px-4 py-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="label-caps">{label}</span>
        <span className={cn('h-px w-7', RULES[accent])} aria-hidden />
      </div>
      <p className="value-num mt-4 text-[1.55rem] leading-none text-foreground">
        {formatCurrency(value, config)}
      </p>
      {hint ? <p className="mt-2 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
