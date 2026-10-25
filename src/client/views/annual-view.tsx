import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/financial/kpi-card'
import { QueryError } from '@/components/feedback/query-error'
import { AnnualCharts } from '@/components/annual/annual-charts'
import { AnnualTables } from '@/components/annual/annual-tables'
import { GoalsNotes } from '@/components/annual/goals-notes'
import { useCurrencyConfig } from '@/hooks/use-currency-config'
import { useYearSummary } from '@/lib/queries'

export interface AnnualViewProps {
  year: number
  onOpenMonth: (month: number) => void
}

/** Dashboard anual completo: KPIs, evolución, tablas comparativas, metas y notas. */
export function AnnualView({ year, onOpenMonth }: AnnualViewProps) {
  const currency = useCurrencyConfig()
  const { data, isLoading, isError, error, refetch } = useYearSummary(year)

  const now = new Date()
  const currentMonth = year === now.getFullYear() ? now.getMonth() + 1 : null

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[1.6rem] font-medium tracking-[-0.035em]">Plantilla Anual</h2>
            <Badge variant="outline" className="tabular-nums">
              {year}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Consolidado automático de los 12 meses
            {data ? ` · ${data.initializedMonths.length} de 12 meses inicializados` : ''}
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <div className="plot-panel grid grid-cols-1 gap-px overflow-hidden bg-border/60 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[118px] rounded-none bg-card" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[300px] rounded-[2px]" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <QueryError message={error?.message} onRetry={() => void refetch()} />
      ) : data ? (
        <>
          <div className="plot-panel grid grid-cols-1 gap-px overflow-hidden bg-border/60 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Ingreso total"
              value={data.summary.kpis.totalIncome}
              config={currency}
              accent="income"
              hint="Ingresos reales del año"
            />
            <KpiCard
              label="Gastos totales"
              value={data.summary.kpis.totalExpenses}
              config={currency}
              accent="expenses"
              hint="Facturas + gastos reales"
            />
            <KpiCard
              label="Restante"
              value={data.summary.kpis.remaining}
              config={currency}
              accent="primary"
              hint="Ingreso − facturas − gastos"
            />
            <KpiCard
              label="Ahorros totales"
              value={data.summary.kpis.totalSavings}
              config={currency}
              accent="savings"
              hint="Ahorro real acumulado"
            />
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="label-caps text-foreground">
                Evolución mensual
              </h3>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                Valores reales de Enero a Diciembre
              </span>
            </div>
            <AnnualCharts series={data.summary.series} config={currency} />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="label-caps text-foreground">
                Tablas comparativas
              </h3>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                Haz clic en un mes para abrir su pestaña
              </span>
            </div>
            <AnnualTables
              tables={data.summary.tables}
              config={currency}
              currentMonth={currentMonth}
              onOpenMonth={onOpenMonth}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="label-caps text-foreground">
                Metas y notas
              </h3>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                Los títulos son editables
              </span>
            </div>
            <GoalsNotes year={year} yearRow={data.year} goals={data.goals} config={currency} />
          </section>
        </>
      ) : null}
    </div>
  )
}
