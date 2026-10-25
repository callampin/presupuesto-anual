import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, Check, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateYear, useDeleteYear, useYears } from '@/lib/queries'
import { cn } from '@/lib/utils'

export interface YearSelectorProps {
  value: number
  onChange: (year: number) => void
}

/** Selector global de año con creación y eliminación de años fiscales. */
export function YearSelector({ value, onChange }: YearSelectorProps) {
  const { data: years, isLoading } = useYears()
  const createYear = useCreateYear()
  const deleteYear = useDeleteYear()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle() {
    setOpen((previous) => !previous)
    setCreating(false)
    setError(null)
    setDeleteError(null)
    setNewYear(String(value + 1))
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    const year = Number(newYear)
    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      setError('Ingresa un año válido (1900–3000)')
      return
    }

    setError(null)
    createYear.mutate(year, {
      onSuccess: (row) => {
        onChange(row.year)
        setOpen(false)
        setCreating(false)
      },
      onError: (mutationError) => {
        setError(mutationError instanceof Error ? mutationError.message : 'No se pudo crear el año')
      },
    })
  }

  function handleDeleteYear() {
    if (!years || years.length <= 1) return

    const confirmed = window.confirm(
      `¿Eliminar el año fiscal ${value}?\n\nSe borrarán TODOS sus meses, transacciones, metas y notas. Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setDeleteError(null)
    deleteYear.mutate(value, {
      onSuccess: () => {
        const fallback = years.find((row) => row.year !== value)
        if (fallback) onChange(fallback.year)
        setOpen(false)
      },
      onError: (mutationError) => {
        setDeleteError(
          mutationError instanceof Error ? mutationError.message : 'No se pudo eliminar el año',
        )
      },
    })
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="gap-1.5 font-mono text-[11px]"
      >
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="tabular-nums">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-[2px] border border-border bg-card p-1.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.85)]">
          <p className="px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Año fiscal
          </p>

          <div className="max-h-56 overflow-y-auto" role="listbox">
            {isLoading ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">Cargando…</p>
            ) : (
              years?.map((row) => (
                <button
                  key={row.year}
                  type="button"
                  role="option"
                  aria-selected={row.year === value}
                  onClick={() => {
                    onChange(row.year)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between border-l border-transparent px-2 py-1.5 text-sm transition-colors',
                    row.year === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'text-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="tabular-nums">{row.year}</span>
                  {row.year === value ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              ))
            )}
          </div>

          <div className="mt-1.5 border-t border-border/70 pt-1.5">
            {creating ? (
              <form onSubmit={handleCreate} className="space-y-1.5 px-1">
                <Input
                  autoFocus
                  inputMode="numeric"
                  value={newYear}
                  onChange={(event) => setNewYear(event.target.value)}
                  aria-label="Nuevo año"
                  className="h-8 text-sm tabular-nums"
                />
                {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
                <div className="flex gap-1.5">
                  <Button type="submit" size="sm" className="flex-1" disabled={createYear.isPending}>
                    {createYear.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Crear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCreating(false)
                      setError(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo año
                </button>

                <button
                  type="button"
                  onClick={handleDeleteYear}
                  disabled={!years || years.length <= 1 || deleteYear.isPending}
                  title={
                    !years || years.length <= 1
                      ? 'Debe existir al menos un año fiscal'
                      : `Eliminar el año ${value}`
                  }
                  className="flex w-full items-center gap-2 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleteYear.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Eliminar año {value}
                </button>
              </div>
            )}

            {deleteError ? (
              <p className="px-2 pt-1 text-[11px] text-destructive">{deleteError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
