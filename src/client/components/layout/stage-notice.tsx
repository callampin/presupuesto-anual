import { CheckCircle2, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export interface StageNoticeProps {
  stage: number
  title: string
  description: string
  items: string[]
  icon: LucideIcon
}

/** Aviso de alcance para vistas que se completan en etapas posteriores. */
export function StageNotice({ stage, title, description, items, icon: Icon }: StageNoticeProps) {
  return (
    <Card className="border-dashed p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <Badge variant="outline">Etapa {stage}</Badge>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
