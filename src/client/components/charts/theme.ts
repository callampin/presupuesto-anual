/** Tema compartido de Recharts (tinta, hueso y líneas espectrales). */

import type { CurrencyConfig } from '@/lib/format'
import { formatCurrency } from '@/lib/format'

export const CHART_COLORS = {
  budget: 'hsl(var(--muted-foreground) / 0.45)',
  income: 'hsl(var(--income))',
  bills: 'hsl(var(--bills))',
  expenses: 'hsl(var(--expenses))',
  savings: 'hsl(var(--savings))',
  debt: 'hsl(var(--debt))',
  primary: 'hsl(var(--primary))',
  negative: 'hsl(var(--debt))',
} as const

export const CHART_GRID = 'hsl(var(--border) / 0.6)'

export const CHART_AXIS_TICK = {
  fill: 'hsl(var(--muted-foreground))',
  fontSize: 9,
  fontFamily: 'DM Mono, monospace',
}

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 2,
  fontSize: 10,
  fontFamily: 'DM Mono, monospace',
  padding: '6px 8px',
}

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: 'hsl(var(--muted-foreground))',
  fontSize: 9,
  fontFamily: 'DM Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}

export const CHART_TOOLTIP_ITEM_STYLE = {
  color: 'hsl(var(--foreground))',
  fontSize: 11,
  fontFamily: 'DM Mono, monospace',
}

export const CHART_LEGEND_STYLE = {
  fontSize: 9,
  color: 'hsl(var(--muted-foreground))',
  fontFamily: 'DM Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}

/** Formateador compacto para ejes (1.2 k). */
export function compactNumberFormatter(locale: string) {
  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  return (value: unknown) => formatter.format(Number(value))
}

/** Formateador de tooltips con la moneda configurada. */
export function currencyTooltipFormatter(config: CurrencyConfig) {
  return (value: unknown) => formatCurrency(Number(value), config)
}
