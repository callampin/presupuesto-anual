import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

export interface ChartCardProps {
  title: string
  subtitle?: string
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
}

/** Panel común para las gráficas mensuales y anuales. */
export function ChartCard({ title, subtitle, empty, emptyMessage, children }: ChartCardProps) {
  return (
    <Card className="plot-panel p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {subtitle ? (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-3">
        {empty ? (
          <div className="flex h-[220px] items-center justify-center border border-dashed border-border/70 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {emptyMessage ?? 'Sin datos para graficar'}
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
