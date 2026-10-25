import { useState } from 'react'
import { HandCoins, Loader2, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DebtTotalEditor } from '@/components/financial/debt-total-editor'
import { EditableCurrencyCell } from '@/components/financial/editable-currency-cell'
import { EditableTextCell } from '@/components/financial/editable-text-cell'
import { BlockCard } from '@/components/month/block-card'
import { DeleteRowButton, EmptyTableRow } from '@/components/month/row-utils'
import { formatCurrency } from '@/lib/format'
import { remainingAfter } from '@/lib/month'
import {
  useCreateMonthRow,
  useDeleteMonthRow,
  useUpdateCatalogItem,
  useUpdateMonthRow,
  type DebtAccount,
} from '@/lib/queries'
import { cn } from '@/lib/utils'
import type { BlockProps } from './income-block'

/** Bloque 5 — Deudas: abonos del mes y saldo pendiente acumulado. */
export function DebtBlock({ year, month, data, config }: BlockProps) {
  const create = useCreateMonthRow('debts', year, month)
  const update = useUpdateMonthRow('debts', year, month)
  const remove = useDeleteMonthRow('debts', year, month)
  const updateCatalog = useUpdateCatalogItem()
  const [addError, setAddError] = useState<string | null>(null)
  const totals = data.summary.totals.debts

  const accounts = data.debtAccounts.filter((account) => account.isActive || account.isSettled)
  const pendingTotal = accounts.reduce(
    (total, account) => total + (account.remainingAmount ?? 0),
    0,
  )
  const withoutTotal = accounts.filter((account) => account.totalAmount === null).length

  const monthCatalogIds = new Set(
    data.debts
      .map((row) => row.catalogItemId)
      .filter((id): id is number => id !== null),
  )
  const missingAccounts = accounts.filter(
    (account) => !account.isSettled && !monthCatalogIds.has(account.catalogItemId),
  )
  const totalRows = data.debts.length + missingAccounts.length

  function handleAddToMonth(account: DebtAccount) {
    setAddError(null)
    create.mutate(
      {
        name: account.name,
        catalogItemId: account.catalogItemId,
        expectedAmount: account.defaultAmount,
      },
      {
        onError: (error) =>
          setAddError(
            error instanceof Error ? error.message : 'No se pudo agregar la deuda al mes',
          ),
      },
    )
  }

  return (
    <BlockCard
      title="Deuda"
      index="05"
      icon={HandCoins}
      accent="debt"
      budgetLabel="Esperado"
      actualLabel="Real"
      budgetTotal={totals.budget}
      actualTotal={totals.actual}
      remaining={remainingAfter(data.summary, 'debt')}
      config={config}
      showAdd={false}
      hint="Las deudas se crean en el catálogo; usa “Agregar al mes” para registrar su pago. Al llegar a 0 se marca como saldada."
    >
      {accounts.length > 0 ? (
        <div className="border-t border-border/60 px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="label-caps">Saldo de deudas</span>
            <span className="text-muted-foreground">
              Pendiente total:{' '}
              <span className="font-semibold tabular-nums text-debt">
                {formatCurrency(pendingTotal, config)}
              </span>
              {withoutTotal > 0 ? ` · ${withoutTotal} sin total` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {accounts.map((account) => {
              const ratio =
                account.totalAmount !== null && account.totalAmount > 0
                  ? Math.min(100, (account.paidAmount / account.totalAmount) * 100)
                  : 0

              return (
                <div
                  key={account.catalogItemId}
                  className="border-b border-border/50 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{account.name}</span>
                    {account.isSettled ? (
                      <Badge variant="success">Saldada</Badge>
                    ) : account.totalAmount === null ? (
                      <Badge variant="outline">Sin total</Badge>
                    ) : null}
                  </div>

                  {account.totalAmount === null ? (
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        Define el monto total para seguir el saldo.
                      </span>
                      {account.isActive ? (
                        <DebtTotalEditor
                          value={null}
                          config={config}
                          onCommit={(totalAmount) =>
                            updateCatalog.mutate({
                              id: account.catalogItemId,
                              patch: { totalAmount },
                            })
                          }
                        />
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <Progress
                        value={ratio}
                        className="mt-2"
                        indicatorClassName={account.isSettled ? 'bg-income' : 'bg-debt'}
                      />
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          Pagado {formatCurrency(account.paidAmount, config)} de{' '}
                          {formatCurrency(account.totalAmount, config)}
                        </span>
                        <span>
                          Pendiente {formatCurrency(account.remainingAmount ?? 0, config)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {addError ? <p className="px-4 pb-2 text-[11px] text-destructive">{addError}</p> : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Concepto</TableHead>
            <TableHead className="w-[36%]">Saldo</TableHead>
            <TableHead className="text-right">Esperado</TableHead>
            <TableHead className="text-right">Real</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {totalRows === 0 ? (
            <EmptyTableRow
              colSpan={5}
              message={
                accounts.length === 0
                  ? 'No hay deudas en el catálogo. Créalas en Catálogo y ajustes → Deudas.'
                  : 'No hay deudas pendientes en este mes.'
              }
            />
          ) : (
            <>
              {data.debts.map((row) => {
                const ratio =
                  row.totalAmount !== null && row.totalAmount > 0
                    ? Math.min(100, (row.paidAmount / row.totalAmount) * 100)
                    : 0

                return (
                  <TableRow
                    key={row.id}
                    className={cn('border-border/40', row.isSettled && 'bg-income/5')}
                  >
                    <TableCell className="py-1">
                      <EditableTextCell
                        value={row.name}
                        ariaLabel={`Deuda ${row.name}`}
                        onCommit={(name) => update.mutate({ id: row.id, patch: { name } })}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      {row.totalAmount === null ? (
                        <span className="text-[11px] text-muted-foreground">
                          {row.catalogItemId === null
                            ? 'Sin seguimiento (fila manual)'
                            : 'Define el total arriba'}
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <span className="tabular-nums">
                              {formatCurrency(row.paidAmount, config)} de{' '}
                              {formatCurrency(row.totalAmount, config)}
                            </span>
                            {row.isSettled ? <Badge variant="success">Saldada</Badge> : null}
                          </div>
                          <Progress
                            value={ratio}
                            indicatorClassName={row.isSettled ? 'bg-income' : 'bg-debt'}
                          />
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">
                              Abono del mes: {formatCurrency(row.actualAmount, config)}
                            </span>
                            <span
                              className={cn(
                                'tabular-nums',
                                row.isSettled
                                  ? 'text-income'
                                  : 'text-muted-foreground',
                              )}
                            >
                              Pendiente {formatCurrency(row.remainingAmount ?? 0, config)}
                            </span>
                          </div>
                        </div>
                      )}
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
                        ariaLabel={`Pago real de ${row.name}`}
                        onCommit={(actualAmount) =>
                          update.mutate({ id: row.id, patch: { actualAmount } })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <DeleteRowButton
                        label={row.name}
                        confirmMessage={
                          row.actualAmount !== 0
                            ? `"${row.name}" tiene un abono registrado. Si eliminas la fila, el saldo pendiente se recalculará. ¿Continuar?`
                            : undefined
                        }
                        onDelete={() => remove.mutate(row.id)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}

              {missingAccounts.map((account) => {
                const ratio =
                  account.totalAmount !== null && account.totalAmount > 0
                    ? Math.min(100, (account.paidAmount / account.totalAmount) * 100)
                    : 0

                return (
                  <TableRow
                    key={`missing-${account.catalogItemId}`}
                    className="border-dashed border-border/60"
                  >
                    <TableCell className="py-1">
                      <span className="block px-2 py-1 text-sm">{account.name}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      {account.totalAmount === null ? (
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">
                            Define el total arriba para ver el saldo.
                          </p>
                          <Badge variant="outline">Sin total</Badge>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="tabular-nums">
                              {formatCurrency(account.paidAmount, config)} de{' '}
                              {formatCurrency(account.totalAmount, config)}
                            </span>
                            <span>
                              Pendiente {formatCurrency(account.remainingAmount ?? 0, config)}
                            </span>
                          </div>
                          <Progress value={ratio} indicatorClassName="bg-debt" />
                          <p className="text-[10px] text-muted-foreground">
                            No incluida en este mes.
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell colSpan={2} className="px-2 py-1 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={create.isPending}
                        onClick={() => handleAddToMonth(account)}
                      >
                        {create.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Agregar al mes
                      </Button>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )
              })}
            </>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total deuda</TableCell>
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
