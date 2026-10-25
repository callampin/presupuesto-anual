import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { formatAmountInput, formatCurrency, parseAmountInput, type CurrencyConfig } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface EditableCurrencyCellProps {
  value: number
  config: CurrencyConfig
  /** Se invoca solo cuando el monto cambia y es un número válido. */
  onCommit: (value: number) => void
  disabled?: boolean
  className?: string
  align?: 'left' | 'right'
  ariaLabel?: string
}

/**
 * Celda de edición rápida de montos (estilo hoja de cálculo).
 * Enter o perder el foco guarda; Escape cancela.
 */
export function EditableCurrencyCell({
  value,
  config,
  onCommit,
  disabled = false,
  className,
  align = 'right',
  ariaLabel,
}: EditableCurrencyCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelled = useRef(false)
  const maxDecimals = Math.max(config.decimalPlaces, 2)

  function startEditing() {
    if (disabled) return
    cancelled.current = false
    setDraft(value === 0 ? '' : formatAmountInput(String(value), { maxDecimals }))
    setEditing(true)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const caretFromEnd = input.value.length - (input.selectionStart ?? input.value.length)
    const formatted = formatAmountInput(input.value, { maxDecimals })
    if (input.value !== formatted) input.value = formatted
    setDraft(formatted)

    requestAnimationFrame(() => {
      const position = Math.max(0, formatted.length - caretFromEnd)
      try {
        input.setSelectionRange(position, position)
      } catch {
        // El input puede haberse desmontado; no es un error relevante.
      }
    })
  }

  function commit() {
    const parsed = parseAmountInput(draft)
    if (parsed !== null && parsed !== value) onCommit(parsed)
    setEditing(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
    if (event.key === 'Escape') {
      cancelled.current = true
      event.currentTarget.blur()
    }
  }

  function handleBlur() {
    if (cancelled.current) {
      cancelled.current = false
      setEditing(false)
      return
    }
    commit()
  }

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        aria-label={ariaLabel}
        value={draft}
        placeholder="0"
        onChange={handleChange}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          'w-full rounded-[2px] border border-ring/60 bg-background px-2 py-1 font-mono text-[12px] tabular-nums',
          'focus:outline-none focus:ring-2 focus:ring-ring/40',
          align === 'right' ? 'text-right' : 'text-left',
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={disabled ? undefined : 'Clic para editar'}
      disabled={disabled}
      onClick={startEditing}
      className={cn(
        'w-full rounded-[2px] px-2 py-1 font-mono text-[12px] transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
        !disabled && 'hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
        disabled && 'cursor-default text-muted-foreground',
        value === 0 && 'text-muted-foreground',
        className,
      )}
    >
      {formatCurrency(value, config)}
    </button>
  )
}
