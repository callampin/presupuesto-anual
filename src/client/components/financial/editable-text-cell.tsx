import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export interface EditableTextCellProps {
  value: string
  onCommit: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  ariaLabel?: string
}

/** Celda de texto editable en línea; ignora valores vacíos. */
export function EditableTextCell({
  value,
  onCommit,
  disabled = false,
  placeholder = '—',
  className,
  ariaLabel,
}: EditableTextCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelled = useRef(false)

  function startEditing() {
    if (disabled) return
    cancelled.current = false
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed !== '' && trimmed !== value) onCommit(trimmed)
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

  if (editing) {
    return (
      <input
        autoFocus
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (cancelled.current) {
            cancelled.current = false
            setEditing(false)
            return
          }
          commit()
        }}
        className={cn(
          'w-full rounded-[2px] border border-ring/60 bg-background px-2 py-1 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring/40',
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      title={disabled ? undefined : 'Clic para editar'}
      onClick={startEditing}
      className={cn(
        'w-full truncate rounded-[2px] px-2 py-1 text-left text-sm transition-colors',
        !disabled && 'hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50',
        disabled && 'cursor-default',
        value === '' && 'text-muted-foreground',
        className,
      )}
    >
      {value === '' ? placeholder : value}
    </button>
  )
}
