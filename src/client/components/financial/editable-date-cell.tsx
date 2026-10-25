import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export interface EditableDateCellProps {
  value: string | null
  onCommit: (value: string | null) => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

/** Celda de fecha (calendario nativo) con guardado al perder el foco. */
export function EditableDateCell({
  value,
  onCommit,
  disabled = false,
  className,
  ariaLabel,
}: EditableDateCellProps) {
  const cancelled = useRef(false)

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

  const initialValue = value ?? ''

  return (
    <input
      type="date"
      aria-label={ariaLabel}
      disabled={disabled}
      defaultValue={initialValue}
      key={initialValue}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (cancelled.current) {
          cancelled.current = false
          event.currentTarget.value = initialValue
          return
        }
        const next = event.currentTarget.value
        const normalized = next === '' ? null : next
        if (normalized !== value) onCommit(normalized)
      }}
      className={cn(
        'w-full rounded-[2px] border border-transparent bg-transparent px-2 py-1 font-mono text-[10px]',
        'hover:border-border focus:border-ring/60 focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring/40',
        'disabled:cursor-default disabled:opacity-60',
        '[color-scheme:dark]',
        className,
      )}
    />
  )
}
