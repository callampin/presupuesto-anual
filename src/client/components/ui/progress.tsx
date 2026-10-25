import { cn } from '@/lib/utils'

export interface ProgressProps {
  /** Porcentaje 0–100 (puede superarse; se recorta visualmente). */
  value: number
  className?: string
  indicatorClassName?: string
  'aria-label'?: string
}

export function Progress({
  value,
  className,
  indicatorClassName,
  'aria-label': ariaLabel,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('h-[3px] w-full overflow-hidden bg-muted', className)}
    >
      <div
        className={cn('h-full bg-primary transition-all duration-500', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
