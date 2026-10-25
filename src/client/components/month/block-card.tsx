import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, Plus, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency, type CurrencyConfig } from '@/lib/format'
import { cn } from '@/lib/utils'

export type BlockAccent = 'income' | 'bills' | 'expenses' | 'savings' | 'debt'

const ACCENTS: Record<BlockAccent, { icon: string; rule: string }> = {
  income: { icon: 'text-income', rule: 'bg-income' },
  bills: { icon: 'text-bills', rule: 'bg-bills' },
  expenses: { icon: 'text-expenses', rule: 'bg-expenses' },
  savings: { icon: 'text-savings', rule: 'bg-savings' },
  debt: { icon: 'text-debt', rule: 'bg-debt' },
}

export interface BlockCardProps {
  title: string
  /** Marca de orden en la cascada (01–05). */
  index?: string
  icon: LucideIcon
  accent: BlockAccent
  budgetLabel: string
  actualLabel: string
  budgetTotal: number
  actualTotal: number
  remaining?: { budget: number; actual: number }
  config: CurrencyConfig
  addPlaceholder?: string
  onAdd?: (name: string) => void
  addPending?: boolean
  addError?: string | null
  /** Permite ocultar el botón “Agregar” (ej. deudas, que se crean en el catálogo). */
  showAdd?: boolean
  hint?: string
  className?: string
  children: ReactNode
}

/** Panel de un bloque mensual: encabezado de medida, totales y tabla. */
export function BlockCard({
  title,
  index,
  icon: Icon,
  accent,
  budgetLabel,
  actualLabel,
  budgetTotal,
  actualTotal,
  remaining,
  config,
  addPlaceholder,
  onAdd,
  addPending = false,
  addError,
  showAdd = true,
  hint,
  className,
  children,
}: BlockCardProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const styles = ACCENTS[accent]

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') return
    onAdd?.(trimmed)
    setName('')
    setAdding(false)
  }

  return (
    <Card className={cn('plot-panel min-w-0 overflow-hidden p-0', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {index ? (
            <span className="font-mono text-[8px] tabular-nums text-muted-foreground/60">
              {index}
            </span>
          ) : null}
          <span className={cn('h-3 w-px', styles.rule)} aria-hidden="true" />
          <Icon className={cn('h-3.5 w-3.5 shrink-0', styles.icon)} aria-hidden="true" />
          <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
        </div>

        {showAdd ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 font-mono text-[9px] uppercase tracking-[0.12em]"
            onClick={() => setAdding((value) => !value)}
          >
            {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {adding ? 'Cancelar' : 'Agregar'}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/70 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
        <span>
          {budgetLabel}{' '}
          <span className="text-foreground/85">{formatCurrency(budgetTotal, config)}</span>
        </span>
        <span>
          {actualLabel}{' '}
          <span className="text-foreground/85">{formatCurrency(actualTotal, config)}</span>
        </span>
        {remaining ? (
          <span className="inline-flex items-center gap-2 border-l border-border/70 pl-4">
            Restante
            <span
              className={cn(
                'text-[10px] tabular-nums',
                remaining.actual < 0 ? 'text-debt' : 'text-foreground',
              )}
            >
              {formatCurrency(remaining.actual, config)}
            </span>
            <span className="text-muted-foreground/60">
              / pres. {formatCurrency(remaining.budget, config)}
            </span>
          </span>
        ) : null}
      </div>

      {hint ? (
        <p className="border-b border-border/60 px-4 py-2 text-[10px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {showAdd && adding ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={addPlaceholder}
            aria-label={`Nuevo concepto en ${title}`}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" disabled={name.trim() === '' || addPending}>
            {addPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Añadir
          </Button>
        </form>
      ) : null}

      {addError ? <p className="px-4 py-2 text-[10px] text-destructive">{addError}</p> : null}

      {children}
    </Card>
  )
}
