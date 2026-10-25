import { useEffect, useRef, useState } from 'react'
import { ALargeSmall, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UI_SCALE_OPTIONS } from '@/lib/ui-scale'
import { cn } from '@/lib/utils'

export interface UiScaleSelectorProps {
  value: number
  onChange: (value: number) => void
}

/** Selector compacto del tamaño de la interfaz (80%–150%). */
export function UiScaleSelector({ value, onChange }: UiScaleSelectorProps) {
  const [open, setOpen] = useState(false)
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

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Tamaño de la interfaz: ${value}%`}
        title="Tamaño de la interfaz"
        className="gap-1.5 font-mono text-[11px] tabular-nums"
      >
        <ALargeSmall className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{value}%</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-[2px] border border-border bg-card p-1.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.85)]">
          <p className="px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Tamaño de interfaz
          </p>

          <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="Tamaño de la interfaz">
            {UI_SCALE_OPTIONS.map((option) => {
              const active = option === value
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between border-l border-transparent px-2 py-1.5 font-mono text-[11px] tabular-nums transition-colors',
                    active
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'text-foreground hover:bg-muted/50',
                  )}
                >
                  <span>{option}%</span>
                  {active ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
