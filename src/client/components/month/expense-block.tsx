import { Lock, Tag } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BudgetProgress } from '@/components/financial/budget-progress'
import { EditableCurrencyCell } from '@/components/financial/editable-currency-cell'
import { EditableTextCell } from '@/components/financial/editable-text-cell'
import { BlockCard } from '@/components/month/block-card'
import { DeleteRowButton, EmptyTableRow } from '@/components/month/row-utils'
import { formatCurrency } from '@/lib/format'
import { remainingAfter } from '@/lib/month'
import { useCreateMonthRow, useDeleteMonthRow, useUpdateMonthRow } from '@/lib/queries'
import type { BlockProps } from './income-block'

/** Bloque 3 — Categorías de gasto variable. El Real se calcula desde las transacciones. */
export function ExpenseBlock({ year, month, data, config }: BlockProps) {
  const create = useCreateMonthRow('expense-categories', year, month)
  const update = useUpdateMonthRow('expense-categories', year, month)
  const remove = useDeleteMonthRow('expense-categories', year, month)
  const totals = data.summary.totals.expenses

  return (
    <BlockCard
      title="Gastos variables"
      index="03"
      icon={Tag}
      accent="expenses"
      budgetLabel="Presupuesto"
      actualLabel="Real"
      budgetTotal={totals.budget}
      actualTotal={totals.actual}
      remaining={remainingAfter(data.summary, 'expense')}
      config={config}
      addPlaceholder="Ej. Despensa, Transporte…"
      onAdd={(name) => create.mutate({ name })}
      addPending={create.isPending}
      addError={create.error instanceof Error ? create.error.message : null}
      hint="El Real se calcula automáticamente desde el registro de gastos."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[38%]">Categoría</TableHead>
            <TableHead className="text-right">Presupuesto</TableHead>
            <TableHead className="w-[34%] text-right">
              <span className="inline-flex items-center gap-1" title="Calculado desde el registro de gastos">
                <Lock className="h-3 w-3" />
                Real
              </span>
            </TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.expenseCategories.length === 0 ? (
            <EmptyTableRow colSpan={4} message="Sin categorías de gasto. Usa “Agregar”." />
          ) : (
            data.expenseCategories.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="py-1">
                  <EditableTextCell
                    value={row.name}
                    ariaLabel={`Categoría de gasto ${row.name}`}
                    onCommit={(name) => update.mutate({ id: row.id, patch: { name } })}
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
                <TableCell className="py-1">
                  <div className="text-right text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(row.actualAmount, config)}
                  </div>
                  <BudgetProgress
                    budget={row.budgetAmount}
                    actual={row.actualAmount}
                    config={config}
                    showAmounts={false}
                    className="mt-1"
                  />
                </TableCell>
                <TableCell className="py-1">
                  <DeleteRowButton
                    label={row.name}
                    confirmMessage={
                      row.actualAmount !== 0
                        ? `"${row.name}" tiene gastos registrados. Se eliminarán también. ¿Continuar?`
                        : undefined
                    }
                    onDelete={() => remove.mutate(row.id)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total gastos</TableCell>
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
