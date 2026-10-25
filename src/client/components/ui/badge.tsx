import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'border-border bg-muted/50 text-muted-foreground',
  income: 'border-income/30 bg-income/10 text-income',
  bills: 'border-bills/30 bg-bills/10 text-bills',
  expenses: 'border-expenses/30 bg-expenses/10 text-expenses',
  savings: 'border-savings/30 bg-savings/10 text-savings',
  debt: 'border-debt/30 bg-debt/10 text-debt',
  success: 'border-income/30 bg-income/10 text-income',
  warning: 'border-expenses/30 bg-expenses/10 text-expenses',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  outline: 'border-border bg-transparent text-muted-foreground',
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em]',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
