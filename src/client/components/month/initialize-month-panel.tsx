import { Copy, FilePlus2, Library, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useInitializeMonth, type InitializeSource } from '@/lib/queries'
import { cn } from '@/lib/utils'

export interface InitializeMonthPanelProps {
  year: number
  month: number
  monthName: string
}

const OPTIONS: Array<{
  source: InitializeSource
  title: string
  description: string
  icon: typeof Library
  recommended?: boolean
}> = [
  {
    source: 'catalog',
    title: 'Catálogo maestro',
    description:
      'Copia tus conceptos activos (ingresos, facturas, gastos, ahorros y deudas) con sus montos base y días de pago.',
    icon: Library,
    recommended: true,
  },
  {
    source: 'previous',
    title: 'Copiar mes anterior',
    description:
      'Replica la estructura y los presupuestos del mes previo, desplazando las fechas un mes.',
    icon: Copy,
  },
  {
    source: 'blank',
    title: 'Empezar en blanco',
    description: 'Crea el mes vacío y agrega las filas manualmente una por una.',
    icon: FilePlus2,
  },
]

/** Asistente que aparece cuando el mes aún no está inicializado. */
export function InitializeMonthPanel({ year, month, monthName }: InitializeMonthPanelProps) {
  const initialize = useInitializeMonth(year, month)

  return (
    <Card className="plot-panel p-0">
      <div className="border-b border-border/70 px-5 py-4">
        <h3 className="text-lg font-medium tracking-[-0.02em]">Inicializa {monthName}</h3>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Este mes todavía no tiene datos. Elige cómo quieres crear su estructura; después podrás
          editar cualquier fila.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const isPending = initialize.isPending && initialize.variables === option.source

          return (
            <div key={option.source} className="flex flex-col justify-between gap-5 p-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {option.recommended ? <Badge variant="success">Recomendado</Badge> : null}
                </div>
                <p className="mt-4 text-sm font-medium">{option.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              </div>

              <Button
                size="sm"
                variant={option.recommended ? 'default' : 'outline'}
                className={cn('w-full')}
                disabled={initialize.isPending}
                onClick={() => initialize.mutate(option.source)}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Usar esta opción
              </Button>
            </div>
          )
        })}
      </div>

      {initialize.isError ? (
        <p className="border-t border-destructive/30 bg-destructive/5 px-5 py-2.5 text-[11px] text-destructive">
          {initialize.error instanceof Error
            ? initialize.error.message
            : 'No se pudo inicializar el mes'}
        </p>
      ) : null}
    </Card>
  )
}
