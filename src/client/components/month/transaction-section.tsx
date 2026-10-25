import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { AmountInput } from '@/components/financial/amount-input'
import { EmptyTableRow } from '@/components/month/row-utils'
import { formatCurrency, parseAmountInput, type CurrencyConfig } from '@/lib/format'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
  type MonthResponse,
} from '@/lib/queries'

export interface TransactionSectionProps {
  year: number
  month: number
  data: MonthResponse
  config: CurrencyConfig
}

function defaultDate(year: number, month: number): string {
  const now = new Date()
  if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    return `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/** Registro diario de gastos con formulario rápido, filtros y edición en línea. */
export function TransactionSection({ year, month, data, config }: TransactionSectionProps) {
  const create = useCreateTransaction(year, month)
  const update = useUpdateTransaction(year, month)
  const remove = useDeleteTransaction(year, month)

  const categories = data.expenseCategories
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => defaultDate(year, month))
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setDate(defaultDate(year, month))
  }, [year, month])

  useEffect(() => {
    const ids = categories.map((category) => category.id)
    setCategoryId((previous) => {
      if (previous !== '' && ids.includes(Number(previous))) return previous
      return ids[0] !== undefined ? String(ids[0]) : ''
    })
  }, [categories])

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return data.transactions
      .filter((transaction) => {
        if (filterCategory !== 'all' && transaction.expenseCategoryId !== Number(filterCategory)) {
          return false
        }
        if (term === '') return true
        const category = categoryNames.get(transaction.expenseCategoryId) ?? ''
        return (
          transaction.notes.toLowerCase().includes(term) ||
          category.toLowerCase().includes(term)
        )
      })
      .sort(
        (a, b) =>
          (b.date ?? '').localeCompare(a.date ?? '') ||
          b.id - a.id,
      )
  }, [data.transactions, filterCategory, search, categoryNames])

  const filteredTotal = filtered.reduce((total, transaction) => total + transaction.amount, 0)
  const hasCategories = categories.length > 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!hasCategories) {
      setFormError('Primero agrega una categoría de gasto al mes.')
      return
    }
    const parsed = parseAmountInput(amount)
    if (parsed === null || parsed === 0) {
      setFormError('Ingresa una cantidad válida (distinta de cero).')
      return
    }
    if (categoryId === '') {
      setFormError('Selecciona una categoría.')
      return
    }

    setFormError(null)
    create.mutate(
      {
        expenseCategoryId: Number(categoryId),
        amount: parsed,
        date: date === '' ? null : date,
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          setAmount('')
          setNotes('')
        },
        onError: (mutationError) => {
          setFormError(
            mutationError instanceof Error ? mutationError.message : 'No se pudo registrar el gasto',
          )
        },
      },
    )
  }

  return (
    <Card className="plot-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Registro de gastos</h3>
            <Badge variant="outline" className="tabular-nums">
              {data.transactions.length}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cada gasto actualiza automáticamente el Real de su categoría.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_130px_150px_1fr_auto]">
        <Select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="Categoría del gasto"
          disabled={!hasCategories}
        >
          {hasCategories ? null : <option value="">Sin categorías</option>}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <AmountInput
          placeholder="Cantidad"
          aria-label="Cantidad del gasto"
          value={amount}
          onValueChange={setAmount}
          maxDecimals={Math.max(config.decimalPlaces, 2)}
          className="text-right tabular-nums"
        />

        <Input
          type="date"
          aria-label="Fecha del gasto"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="[color-scheme:dark]"
        />

        <Input
          placeholder="Notas (opcional)"
          aria-label="Notas del gasto"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <Button type="submit" disabled={create.isPending || !hasCategories}>
          {create.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Registrar
        </Button>
      </form>

      {formError ? <p className="mt-2 text-[11px] text-destructive">{formError}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nota o categoría…"
            aria-label="Buscar gastos"
            className="pl-8"
          />
        </div>
        <Select
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
          aria-label="Filtrar por categoría"
          className="w-full sm:w-52"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[14%]">Fecha</TableHead>
              <TableHead className="w-[22%]">Categoría</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <EmptyTableRow
                colSpan={5}
                message={
                  data.transactions.length === 0
                    ? 'Aún no hay gastos registrados en este mes.'
                    : 'Ningún gasto coincide con el filtro.'
                }
              />
            ) : (
              filtered.map((transaction) => {
                const categoryName =
                  categoryNames.get(transaction.expenseCategoryId) ?? 'Sin categoría'
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="py-1">
                      <EditableDateCell
                        value={transaction.date}
                        ariaLabel={`Fecha del gasto ${categoryName}`}
                        onCommit={(nextDate) =>
                          update.mutate({ id: transaction.id, patch: { date: nextDate } })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Select
                        value={transaction.expenseCategoryId}
                        aria-label={`Categoría del gasto ${categoryName}`}
                        onChange={(event) =>
                          update.mutate({
                            id: transaction.id,
                            patch: { expenseCategoryId: Number(event.target.value) },
                          })
                        }
                        className="h-8 border-transparent bg-transparent"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <EditableCurrencyCell
                        value={transaction.amount}
                        config={config}
                        ariaLabel={`Cantidad del gasto ${categoryName}`}
                        onCommit={(nextAmount) =>
                          update.mutate({ id: transaction.id, patch: { amount: nextAmount } })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <EditableTextCell
                        value={transaction.notes}
                        ariaLabel={`Notas del gasto ${categoryName}`}
                        onCommit={(nextNotes) =>
                          update.mutate({ id: transaction.id, patch: { notes: nextNotes } })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar gasto"
                        className="h-7 w-7 text-muted-foreground/70 hover:text-destructive"
                        onClick={() => {
                          if (window.confirm('¿Eliminar este gasto?')) remove.mutate(transaction.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>
                {filtered.length} de {data.transactions.length} gastos
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(filteredTotal, config)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Card>
  )
}
