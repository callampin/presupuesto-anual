import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'

export function DeleteRowButton({
  label,
  onDelete,
  confirmMessage,
}: {
  label: string
  onDelete: () => void
  /** `null` omite la confirmación; `undefined` usa el mensaje genérico. */
  confirmMessage?: string | null
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Eliminar ${label}`}
      title={`Eliminar ${label}`}
      className="h-7 w-7 text-muted-foreground/70 hover:text-destructive"
      onClick={() => {
        if (confirmMessage === null) {
          onDelete()
          return
        }
        if (window.confirm(confirmMessage ?? `¿Eliminar "${label}"?`)) onDelete()
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}

export function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-6 text-center text-xs text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  )
}
