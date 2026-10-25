import { useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useResetAllData } from '@/lib/queries'

/** Borrado total con doble confirmación (botón + palabra escrita). */
export function DangerZone() {
  const reset = useResetAllData()
  const [confirming, setConfirming] = useState(false)
  const [word, setWord] = useState('')
  const [error, setError] = useState<string | null>(null)

  function cancel() {
    setConfirming(false)
    setWord('')
    setError(null)
  }

  function handleReset() {
    if (word !== 'ELIMINAR') return
    setError(null)
    reset.mutate(undefined, {
      onSuccess: () => {
        window.localStorage.removeItem('finanzas.activeYear')
        window.location.hash = '#/anual'
        window.location.reload()
      },
      onError: (mutationError) => {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : 'No se pudieron eliminar los datos',
        )
      },
    })
  }

  return (
    <Card className="plot-panel border-destructive/40 bg-destructive/[0.02] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-destructive">Zona de peligro</h3>
          <p className="mt-0.5 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
            Elimina todos los datos y deja la aplicación como recién instalada. Esta acción no se
            puede deshacer.
          </p>
        </div>
      </div>

      {!confirming ? (
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar todos los datos
        </Button>
      ) : (
        <div className="mt-3 rounded-[2px] border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-xs font-medium text-destructive">
            Se eliminarán años, meses, ingresos, facturas, gastos, transacciones, ahorros, deudas,
            metas, notas, catálogo, simulaciones y configuración.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Escribe{' '}
            <span className="font-mono font-semibold tracking-wide text-destructive">ELIMINAR</span>{' '}
            para confirmar:
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              autoFocus
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="ELIMINAR"
              aria-label="Confirmación para borrar todos los datos"
              className="font-mono sm:w-56"
              disabled={reset.isPending}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              disabled={word !== 'ELIMINAR' || reset.isPending}
            >
              {reset.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Eliminar definitivamente
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel} disabled={reset.isPending}>
              Cancelar
            </Button>
          </div>

          {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
        </div>
      )}
    </Card>
  )
}
