import { PiggyBank } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditableCurrencyCell } from '@/components/financial/editable-currency-cell'
import { EditableTextCell } from '@/components/financial/editable-text-cell'
import { BlockCard } from '@/components/month/block-card'
import { DeleteRowButton, EmptyTableRow } from '@/components/month/row-utils'
import { formatCurrency } from '@/lib/format'
import { remainingAfter } from '@/lib/month'
import { useCreateMonthRow, useDeleteMonthRow, useUpdateMonthRow } from '@/lib/queries'
import type { BlockProps } from './income-block'

/** Bloque 4 — Ahorros del mes. */
export function SavingBlock({ year, month, data, config }: BlockProps) {
  const create = useCreateMonthRow('savings', year, month)
  const update = useUpdateMonthRow('savings', year, month)
  const remove = useDeleteMonthRow('savings', year, month)
  const totals = data.summary.totals.savings

  return (
    <BlockCard
      title="Ahorros"
      index="04"
      icon={PiggyBank}
      accent="savings"
      budgetLabel="Proyección"
      actualLabel="Real"
      budgetTotal={totals.budget}
      actualTotal={totals.actual}
      remaining={remainingAfter(data.summary, 'saving')}
      config={config}
      addPlaceholder="Ej. Fondo de emergencia…"
      onAdd={(name) => create.mutate({ name })}
      addPending={create.isPending}
      addError={create.error instanceof Error ? create.error.message : null}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[44%]">Concepto</TableHead>
            <TableHead className="text-right">Proyección</TableHead>
            <TableHead className="text-right">Real</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.savings.length === 0 ? (
            <EmptyTableRow colSpan={4} message="Sin metas de ahorro. Usa “Agregar”." />
          ) : (
            data.savings.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-1">
                  <EditableTextCell
                    value={row.name}
                    ariaLabel={`Meta de ahorro ${row.name}`}
                    onCommit={(name) => update.mutate({ id: row.id, patch: { name } })}
                  />
                </TableCell>
                <TableCell className="py-1 text-right">
                  <EditableCurrencyCell
                    value={row.projectedAmount}
                    config={config}
                    ariaLabel={`Proyección de ${row.name}`}
                    onCommit={(projectedAmount) =>
                      update.mutate({ id: row.id, patch: { projectedAmount } })
                    }
                  />
                </TableCell>
                <TableCell className="py-1 text-right">
                  <EditableCurrencyCell
                    value={row.actualAmount}
                    config={config}
                    ariaLabel={`Ahorro real de ${row.name}`}
                    onCommit={(actualAmount) =>
                      update.mutate({ id: row.id, patch: { actualAmount } })
                    }
                  />
                </TableCell>
                <TableCell className="py-1">
                  <DeleteRowButton label={row.name} onDelete={() => remove.mutate(row.id)} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total ahorros</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(totals.budget, config)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(totals.actual, config)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </BlockCard>
  )
}
