import { useRef, useState } from 'react'
import { AmountInput } from '@/components/financial/amount-input'
import {
  formatAmountInput,
  formatCurrency,
  parseAmountInput,
  type CurrencyConfig,
} from '@/lib/format'
import { cn } from '@/lib/utils'

export interface DebtTotalEditorProps {
  value: number | null
  config: CurrencyConfig
  onCommit: (value: number) => void
  className?: string
}

/** Editor del monto total a pagar de una deuda (permite dejarlo sin definir). */
export function DebtTotalEditor({ value, config, onCommit, className }: DebtTotalEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelled = useRef(false)
  const maxDecimals = Math.max(config.decimalPlaces, 2)

  function startEditing() {
    cancelled.current = false
    setDraft(value === null ? '' : formatAmountInput(String(value), { maxDecimals }))
    setEditing(true)
  }

  function commit() {
    const parsed = parseAmountInput(draft)
    if (parsed !== null && parsed >= 0 && parsed !== value) onCommit(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <AmountInput
        autoFocus
        value={draft}
        onValueChange={setDraft}
        maxDecimals={maxDecimals}
        aria-label="Total a pagar de la deuda"
        placeholder="Total"
        className={cn('h-7 w-32 text-right text-xs', className)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            cancelled.current = true
            event.currentTarget.blur()
          }
        }}
        onBlur={() => {
          if (cancelled.current) {
            cancelled.current = false
            setEditing(false)
            return
          }
          commit()
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title={value === null ? 'Definir el monto total a pagar' : 'Editar el monto total a pagar'}
      className={cn(
        'rounded-[1px] px-1 py-0.5 font-mono text-[10px] tabular-nums transition-colors hover:bg-primary/[0.06]',
        value === null ? 'text-primary hover:underline' : 'text-foreground/80',
        className,
      )}
    >
      {value === null ? 'Definir total' : formatCurrency(value, config)}
    </button>
  )
}
