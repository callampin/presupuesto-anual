import { Wallet } from 'lucide-react'
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
import { EditableDateCell } from '@/components/financial/editable-date-cell'
import { EditableTextCell } from '@/components/financial/editable-text-cell'
import { BlockCard } from '@/components/month/block-card'
import { DeleteRowButton, EmptyTableRow } from '@/components/month/row-utils'
import { formatCurrency, type CurrencyConfig } from '@/lib/format'
import { useCreateMonthRow, useDeleteMonthRow, useUpdateMonthRow, type MonthResponse } from '@/lib/queries'

export interface BlockProps {
  year: number
  month: number
  data: MonthResponse
  config: CurrencyConfig
}

/** Bloque 1 — Ingresos del mes. */
export function IncomeBlock({ year, month, data, config }: BlockProps) {
  const create = useCreateMonthRow('incomes', year, month)
  const update = useUpdateMonthRow('incomes', year, month)
  const remove = useDeleteMonthRow('incomes', year, month)
  const totals = data.summary.totals.income

  return (
    <BlockCard
      title="Ingresos"
      index="01"
      icon={Wallet}
      accent="income"
      budgetLabel="Esperado"
      actualLabel="Real"
      budgetTotal={totals.budget}
      actualTotal={totals.actual}
      config={config}
      addPlaceholder="Ej. Quincena 1, Negocio…"
      onAdd={(name) => create.mutate({ name })}
      addPending={create.isPending}
      addError={create.error instanceof Error ? create.error.message : null}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Concepto</TableHead>
            <TableHead className="w-[22%]">Fecha</TableHead>
            <TableHead className="text-right">Esperado</TableHead>
            <TableHead className="text-right">Real</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.incomes.length === 0 ? (
            <EmptyTableRow colSpan={5} message="Sin fuentes de ingreso. Usa “Agregar”." />
          ) : (
            data.incomes.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-1">
                  <EditableTextCell
                    value={row.name}
                    ariaLabel={`Nombre del ingreso ${row.name}`}
                    onCommit={(name) => update.mutate({ id: row.id, patch: { name } })}
                  />
                </TableCell>
                <TableCell className="py-1">
                  <EditableDateCell
                    value={row.date}
                    ariaLabel={`Fecha del ingreso ${row.name}`}
                    onCommit={(date) => update.mutate({ id: row.id, patch: { date } })}
                  />
                </TableCell>
                <TableCell className="py-1 text-right">
                  <EditableCurrencyCell
                    value={row.expectedAmount}
                    config={config}
                    ariaLabel={`Esperado de ${row.name}`}
                    onCommit={(expectedAmount) =>
                      update.mutate({ id: row.id, patch: { expectedAmount } })
                    }
                  />
                </TableCell>
                <TableCell className="py-1 text-right">
                  <EditableCurrencyCell
                    value={row.actualAmount}
                    config={config}
                    ariaLabel={`Real de ${row.name}`}
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
            <TableCell colSpan={2}>Total ingresos</TableCell>
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
