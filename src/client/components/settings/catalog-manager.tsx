import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  HandCoins,
  PiggyBank,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from 'lucide-react'
import type { CatalogItemRow } from '@shared/schema'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditableCurrencyCell } from '@/components/financial/editable-currency-cell'
import { EditableTextCell } from '@/components/financial/editable-text-cell'
import { DebtTotalEditor } from '@/components/financial/debt-total-editor'
import { useCurrencyConfig } from '@/hooks/use-currency-config'
import { cn } from '@/lib/utils'
import {
  useCatalog,
  useCreateCatalogItem,
  useDeleteCatalogItem,
  useReorderCatalog,
  useUpdateCatalogItem,
} from '@/lib/queries'

const SECTIONS = [
  { key: 'income', label: 'Ingresos', icon: Wallet, color: 'text-income' },
  { key: 'bill', label: 'Facturas', icon: ReceiptText, color: 'text-bills' },
  { key: 'expense', label: 'Gastos', icon: BadgeDollarSign, color: 'text-expenses' },
  { key: 'saving', label: 'Ahorros', icon: PiggyBank, color: 'text-savings' },
  { key: 'debt', label: 'Deudas', icon: HandCoins, color: 'text-debt' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

const SECTION_PLACEHOLDER: Record<SectionKey, string> = {
  income: 'Ej. Quincena 1, Freelance…',
  bill: 'Ej. Renta, Internet…',
  expense: 'Ej. Despensa, Transporte…',
  saving: 'Ej. Fondo de emergencia…',
  debt: 'Ej. Tarjeta de crédito…',
}

/** Día habitual del mes (solo aplica a ingresos y facturas). */
function DayOfMonthCell({
  value,
  onCommit,
}: {
  value: number | null
  onCommit: (value: number | null) => void
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      maxLength={2}
      key={value ?? 'empty'}
      defaultValue={value ?? ''}
      placeholder="—"
      aria-label="Día habitual del mes"
      onBlur={(event) => {
        const raw = event.target.value.trim()
        if (raw === '') {
          if (value !== null) onCommit(null)
          return
        }
        const next = Number(raw)
        if (Number.isInteger(next) && next >= 1 && next <= 31) {
          if (next !== value) onCommit(next)
          return
        }
        event.target.value = value === null ? '' : String(value)
      }}
      className="h-8 w-14 text-right tabular-nums"
    />
  )
}

/** Administración del catálogo maestro recurrente. */
export function CatalogManager() {
  const config = useCurrencyConfig()
  const { data: catalog, isLoading, isError } = useCatalog()
  const createItem = useCreateCatalogItem()
  const updateItem = useUpdateCatalogItem()
  const deleteItem = useDeleteCatalogItem()
  const reorder = useReorderCatalog()

  const [section, setSection] = useState<SectionKey>('income')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setNewName('')
    setError(null)
  }, [section])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of catalog ?? []) {
      map.set(item.section, (map.get(item.section) ?? 0) + 1)
    }
    return map
  }, [catalog])

  const items = useMemo(
    () => (catalog ?? []).filter((item) => item.section === section),
    [catalog, section],
  )

  const showDay = section === 'income' || section === 'bill'
  const showDebtTotal = section === 'debt'
  const columnCount = 5 + (showDay ? 1 : 0) + (showDebtTotal ? 1 : 0)

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (name === '') return
    setError(null)
    createItem.mutate(
      { section, name },
      {
        onSuccess: () => setNewName(''),
        onError: (mutationError) =>
          setError(
            mutationError instanceof Error ? mutationError.message : 'No se pudo crear el concepto',
          ),
      },
    )
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const ids = items.map((item) => item.id)
    const current = ids[index]
    const displaced = ids[target]
    if (current === undefined || displaced === undefined) return
    ids[index] = displaced
    ids[target] = current

    setError(null)
    reorder.mutate(
      { section, ids },
      {
        onError: (mutationError) =>
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : 'No se pudo reordenar el catálogo',
          ),
      },
    )
  }

  function patchItem(item: CatalogItemRow, patch: Record<string, unknown>) {
    setError(null)
    updateItem.mutate(
      { id: item.id, patch },
      {
        onError: (mutationError) =>
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : 'No se pudo actualizar el concepto',
          ),
      },
    )
  }

  return (
    <Card className="plot-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Catálogo maestro</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Conceptos recurrentes que se copian al inicializar un mes desde el catálogo.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 border-b border-border/60">
        {SECTIONS.map((item) => {
          const Icon = item.icon
          const active = section === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b px-2.5 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', active ? undefined : item.color)} />
              {item.label}
              <span className="ml-0.5 font-mono text-[9px] tabular-nums text-muted-foreground/70">
                {counts.get(item.key) ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleCreate} className="mt-3 flex items-center gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={SECTION_PLACEHOLDER[section]}
          aria-label="Nombre del nuevo concepto"
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={newName.trim() === '' || createItem.isPending}>
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </form>

      {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
      {isError ? (
        <p className="mt-2 text-[11px] text-destructive">No se pudo cargar el catálogo.</p>
      ) : null}

      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 px-2 text-[9px]">Orden</TableHead>
              <TableHead className="px-2 text-[9px]">Concepto</TableHead>
              <TableHead className="h-8 px-2 text-right text-[9px]">Monto base</TableHead>
              {showDebtTotal ? (
                <TableHead className="h-8 px-2 text-right text-[9px]">Total a pagar</TableHead>
              ) : null}
              {showDay ? (
                <TableHead className="h-8 px-2 text-right text-[9px]">Día</TableHead>
              ) : null}
              <TableHead className="h-8 w-16 px-2 text-center text-[9px]">Activo</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-6 text-center text-xs text-muted-foreground">
                  Cargando catálogo…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="py-6 text-center text-xs text-muted-foreground">
                  Sin conceptos en esta sección.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.id} className={cn(!item.isActive && 'opacity-60')}>
                  <TableCell className="px-1 py-1">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                        aria-label={`Subir ${item.name}`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === items.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                        aria-label={`Bajar ${item.name}`}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-1 py-1">
                    <EditableTextCell
                      value={item.name}
                      ariaLabel={`Nombre de ${item.name}`}
                      onCommit={(name) => patchItem(item, { name })}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <EditableCurrencyCell
                      value={item.defaultAmount}
                      config={config}
                      ariaLabel={`Monto base de ${item.name}`}
                      onCommit={(defaultAmount) => patchItem(item, { defaultAmount })}
                    />
                  </TableCell>
                  {showDebtTotal ? (
                    <TableCell className="px-2 py-1 text-right">
                      <DebtTotalEditor
                        value={item.totalAmount}
                        config={config}
                        onCommit={(totalAmount) => patchItem(item, { totalAmount })}
                      />
                    </TableCell>
                  ) : null}
                  {showDay ? (
                    <TableCell className="px-2 py-1 text-right">
                      <DayOfMonthCell
                        value={item.defaultDayOfMonth}
                        onCommit={(defaultDayOfMonth) => patchItem(item, { defaultDayOfMonth })}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="px-2 py-1 text-center">
                    <Checkbox
                      checked={item.isActive}
                      aria-label={`${item.name} activo`}
                      onChange={(event) => patchItem(item, { isActive: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell className="px-1 py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${item.name}`}
                      className="h-7 w-7 text-muted-foreground/70 hover:text-destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar "${item.name}" del catálogo? Los meses ya creados conservarán su copia.`,
                          )
                        ) {
                          deleteItem.mutate(item.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Los conceptos inactivos no se copian al inicializar meses nuevos. El día habitual se usa
        para las fechas de cobro/pago.
      </p>
    </Card>
  )
}
