import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/feedback/query-error'
import { CascadeSummary } from '@/components/month/cascade-summary'
import { InitializeMonthPanel } from '@/components/month/initialize-month-panel'
import { IncomeBlock } from '@/components/month/income-block'
import { BillBlock } from '@/components/month/bill-block'
import { ExpenseBlock } from '@/components/month/expense-block'
import { SavingBlock } from '@/components/month/saving-block'
import { DebtBlock } from '@/components/month/debt-block'
import { TransactionSection } from '@/components/month/transaction-section'
import { MonthlyCharts } from '@/components/month/monthly-charts'
import { useCurrencyConfig } from '@/hooks/use-currency-config'
import { formatMonthLabel } from '@/lib/format'
import { useMonth } from '@/lib/queries'

export interface MonthlyViewProps {
  year: number
  month: number
}

/** Vista operativa del mes: inicialización, 5 bloques, transacciones y gráficas. */
export function MonthlyView({ year, month }: MonthlyViewProps) {
  const { data, isLoading, isError, error, refetch } = useMonth(year, month)
  const currency = useCurrencyConfig()
  const label = formatMonthLabel(year, month)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[1.6rem] font-medium tracking-[-0.035em]">{label}</h2>
            {data ? (
              <Badge variant={data.period.isInitialized ? 'income' : 'outline'}>
                {data.period.isInitialized ? 'Inicializado' : 'Sin inicializar'}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Seguimiento de gastos · hoja mensual
          </p>
        </div>
        {data ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            MES {String(month).padStart(2, '0')} / 12 · {data.transactions.length}{' '}
            {data.transactions.length === 1 ? 'transacción' : 'transacciones'}
          </span>
        ) : null}
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[132px] rounded-[2px]" />
          <Skeleton className="h-[220px] rounded-[2px]" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Skeleton className="h-[260px] rounded-[2px]" />
            <Skeleton className="h-[260px] rounded-[2px]" />
          </div>
        </div>
      ) : isError ? (
        <QueryError message={error?.message} onRetry={() => void refetch()} />
      ) : !data ? null : !data.period.isInitialized ? (
        <InitializeMonthPanel year={year} month={month} monthName={data.monthName} />
      ) : (
        <>
          <CascadeSummary summary={data.summary} config={currency} />

          <IncomeBlock year={year} month={month} data={data} config={currency} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <BillBlock year={year} month={month} data={data} config={currency} />
              <SavingBlock year={year} month={month} data={data} config={currency} />
            </div>
            <ExpenseBlock year={year} month={month} data={data} config={currency} />
          </div>

          <DebtBlock year={year} month={month} data={data} config={currency} />

          <TransactionSection
            key={`${year}-${month}`}
            year={year}
            month={month}
            data={data}
            config={currency}
          />

          <MonthlyCharts data={data} config={currency} />
        </>
      )}
    </div>
  )
}
