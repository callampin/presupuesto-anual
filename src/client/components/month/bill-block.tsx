import { ReceiptText } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { EditableCurrencyCell } from '@/components/financial/editable-currency-cell'
import { EditableDateCell } from '@/components/financial/editable-date-cell'
import { EditableTextCell } from '@/components/financial/editable-text-cell'
import { BlockCard } from '@/components/month/block-card'
import { DeleteRowButton, EmptyTableRow } from '@/components/month/row-utils'
import { formatCurrency } from '@/lib/format'
import { remainingAfter } from '@/lib/month'
import { useCreateMonthRow, useDeleteMonthRow, useUpdateMonthRow } from '@/lib/queries'
import type { BlockProps } from './income-block'
import { cn } from '@/lib/utils'

/** Bloque 2 — Facturas / pagos fijos del mes. */
export function BillBlock({ year, month, data, config }: BlockProps) {
  const create = useCreateMonthRow('bills', year, month)
  const update = useUpdateMonthRow('bills', year, month)
  const remove = useDeleteMonthRow('bills', year, month)
  const totals = data.summary.totals.bills

  return (
    <BlockCard
      title="Facturas"
      index="02"
      icon={ReceiptText}
      accent="bills"
      budgetLabel="Presupuesto"
      actualLabel="Real"
      budgetTotal={totals.budget}
      actualTotal={totals.actual}
      remaining={remainingAfter(data.summary, 'bill')}
      config={config}
      addPlaceholder="Ej. Renta, Luz, Internet…"
      onAdd={(name) => create.mutate({ name })}
      addPending={create.isPending}
      addError={create.error instanceof Error ? create.error.message : null}
      hint="Marca “Pagado” cuando liquides la factura."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead className="w-[36%]">Concepto</TableHead>
            <TableHead className="w-[22%]">Pago</TableHead>
            <TableHead className="text-right">Presupuesto</TableHead>
            <TableHead className="text-right">Real</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.bills.length === 0 ? (
            <EmptyTableRow colSpan={6} message="Sin facturas. Usa “Agregar”." />
          ) : (
            data.bills.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-1">
                  <Checkbox
                    checked={row.isPaid}
                    aria-label={`Factura ${row.name} pagada`}
                    onChange={(event) =>
                      update.mutate({ id: row.id, patch: { isPaid: event.target.checked } })
                    }
                  />
                </TableCell>
                <TableCell className="py-1">
                  <EditableTextCell
                    value={row.name}
                    ariaLabel={`Nombre de la factura ${row.name}`}
                    className={cn(row.isPaid && 'text-muted-foreground line-through')}
                    onCommit={(name) => update.mutate({ id: row.id, patch: { name } })}
                  />
                </TableCell>
                <TableCell className="py-1">
                  <EditableDateCell
                    value={row.dueDate}
                    ariaLabel={`Fecha de pago de ${row.name}`}
                    onCommit={(dueDate) => update.mutate({ id: row.id, patch: { dueDate } })}
                  />
                </TableCell>
                <TableCell className="py-1 text-right">
                  <EditableCurrencyCell
                    value={row.budgetAmount}
                    config={config}
                    ariaLabel={`Presupuesto de ${row.name}`}
                    onCommit={(budgetAmount) =>
                      update.mutate({ id: row.id, patch: { budgetAmount } })
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
            <TableCell colSpan={3}>Total facturas</TableCell>
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
