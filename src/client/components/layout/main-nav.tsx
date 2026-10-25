import { BarChart3, Settings, TrendingUp } from 'lucide-react'
import { MONTH_SHORT_NAMES_ES } from '@shared/calculations'
import { useCurrentMonth } from '@/hooks/use-current-month'
import type { AppRoute } from '@/hooks/use-view-route'
import { cn } from '@/lib/utils'

const BASE =
  'relative inline-flex h-10 shrink-0 items-center gap-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] transition-colors duration-150'
const ACTIVE = 'text-primary'
const INACTIVE = 'text-muted-foreground hover:text-foreground'

export interface MainNavProps {
  route: AppRoute
  onNavigate: (route: AppRoute) => void
}

/** Índice de la carta: meses como marcas de una escala, no como píldoras. */
export function MainNav({ route, onNavigate }: MainNavProps) {
  const isMonth = (month: number) => route.view === 'month' && route.month === month
  const currentMonth = useCurrentMonth()

  return (
    <nav className="sticky top-0 z-30 border-b border-border/80 bg-background/95">
      <div className="mx-auto flex max-w-[1400px] items-center overflow-x-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate({ view: 'annual', month: null })}
          className={cn(BASE, route.view === 'annual' ? ACTIVE : INACTIVE)}
          aria-current={route.view === 'annual' ? 'page' : undefined}
        >
          <BarChart3 className="h-3 w-3" />
          Anual
          {route.view === 'annual' ? (
            <span className="absolute inset-x-2 bottom-0 h-[2px] bg-primary" aria-hidden />
          ) : null}
        </button>

        <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />

        {MONTH_SHORT_NAMES_ES.map((label, index) => {
          const month = index + 1
          const active = isMonth(month)
          return (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate({ view: 'month', month })}
              className={cn(
                BASE,
                'min-w-[2.5rem] justify-center px-2',
                active ? ACTIVE : INACTIVE,
              )}
              aria-current={active ? 'page' : undefined}
            >
              {label}
              {month === currentMonth ? (
                <span
                  data-current-month="true"
                  className={cn(
                    'absolute left-1/2 top-1.5 h-[3px] w-[3px] -translate-x-1/2',
                    active ? 'bg-primary' : 'bg-muted-foreground/50',
                  )}
                  aria-hidden
                />
              ) : null}
              {active ? (
                <span className="absolute inset-x-2 bottom-0 h-[2px] bg-primary" aria-hidden />
              ) : null}
            </button>
          )
        })}

        <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />

        <button
          type="button"
          onClick={() => onNavigate({ view: 'compound', month: null })}
          className={cn(BASE, route.view === 'compound' ? ACTIVE : INACTIVE)}
          aria-current={route.view === 'compound' ? 'page' : undefined}
        >
          <TrendingUp className="h-3 w-3" />
          Interés compuesto
          {route.view === 'compound' ? (
            <span className="absolute inset-x-2 bottom-0 h-[2px] bg-primary" aria-hidden />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ view: 'settings', month: null })}
          className={cn(BASE, 'border-l border-border/70', route.view === 'settings' ? ACTIVE : INACTIVE)}
          aria-current={route.view === 'settings' ? 'page' : undefined}
        >
          <Settings className="h-3 w-3" />
          Ajustes
          {route.view === 'settings' ? (
            <span className="absolute inset-x-2 bottom-0 h-[2px] bg-primary" aria-hidden />
          ) : null}
        </button>
      </div>
    </nav>
  )
}
