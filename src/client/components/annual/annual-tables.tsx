import type { AnnualSummary, AnnualTable } from '@shared/types'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, type CurrencyConfig } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface AnnualTablesProps {
  tables: AnnualSummary['tables']
  config: CurrencyConfig
  /** Mes actual (1–12) si el año visualizado es el año en curso. */
  currentMonth: number | null
  onOpenMonth: (month: number) => void
}

const ORDER: Array<AnnualTable['key']> = [
  'income',
  'bills',
  'expenses',
  'remaining',
  'savings',
  'debts',
]

function AnnualTableCard({
  table,
  config,
  currentMonth,
  onOpenMonth,
}: {
  table: AnnualTable
  config: CurrencyConfig
  currentMonth: number | null
  onOpenMonth: (month: number) => void
}) {
  const amountClass = (value: number) => (value < 0 ? 'text-debt' : '')

  return (
    <Card className="plot-panel min-w-0 p-0">
      <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-3 py-2.5">
        <h3 className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {table.label}
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {table.budgetLabel} · {table.actualLabel}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-7 px-2 text-[9px]">Mes</TableHead>
            <TableHead className="h-7 px-2 text-right text-[9px]">{table.budgetLabel}</TableHead>
            <TableHead className="h-7 px-2 text-right text-[9px]">{table.actualLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => {
            const isCurrent = row.month === currentMonth
            return (
              <TableRow
                key={row.month}
                className={cn(
                  'border-border/40',
                  isCurrent && 'border-l border-primary/50 bg-primary/[0.04]',
                )}
              >
                <TableCell className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => onOpenMonth(row.month)}
                    title={`Abrir ${row.monthName}`}
                    className={cn(
                      'rounded-[1px] px-1 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:bg-primary/[0.06] hover:text-primary',
                      isCurrent ? 'font-medium text-primary' : 'text-foreground/80',
                    )}
                  >
                    {row.monthName}
                  </button>
                </TableCell>
                <TableCell
                  className={cn(
                    'px-2 py-1 text-right font-mono text-[11px] tabular-nums text-muted-foreground',
                    amountClass(row.budget),
                  )}
                >
                  {formatCurrency(row.budget, config)}
                </TableCell>
                <TableCell
                  className={cn(
                    'px-2 py-1 text-right font-mono text-[11px] tabular-nums',
                    amountClass(row.actual),
                  )}
                >
                  {formatCurrency(row.actual, config)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t border-border">
            <TableCell className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em]">
              Total anual
            </TableCell>
            <TableCell
              className={cn(
                'px-2 py-1.5 text-right font-mono text-[11px] font-medium tabular-nums',
                amountClass(table.total.budget),
              )}
            >
              {formatCurrency(table.total.budget, config)}
            </TableCell>
            <TableCell
              className={cn(
                'px-2 py-1.5 text-right font-mono text-[11px] font-medium tabular-nums',
                amountClass(table.total.actual),
              )}
            >
              {formatCurrency(table.total.actual, config)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Card>
  )
}

/** Las 6 tablas comparativas anuales (12 meses + total). */
export function AnnualTables({ tables, config, currentMonth, onOpenMonth }: AnnualTablesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ORDER.map((key) => (
        <AnnualTableCard
          key={key}
          table={tables[key]}
          config={config}
          currentMonth={currentMonth}
          onOpenMonth={onOpenMonth}
        />
      ))}
    </div>
  )
}
