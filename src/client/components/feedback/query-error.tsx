import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface QueryErrorProps {
  message?: string
  onRetry?: () => void
}

/** Estado de error reutilizable para consultas locales. */
export function QueryError({ message, onRetry }: QueryErrorProps) {
  return (
    <Card className="border-red-500/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium">No se pudieron cargar los datos</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {message ?? 'Verifica que el servidor local esté en ejecución.'}
            </p>
          </div>
        </div>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
