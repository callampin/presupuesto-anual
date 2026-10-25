import { cn } from '@/lib/utils'

/**
 * Marca gráfica de la aplicación. Se sirve desde `public/logo.png`, generado
 * a partir del SVG privado del proyecto; el SVG no se distribuye en el repo.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      data-brand-logo
      draggable={false}
      width={36}
      height={36}
      className={cn('h-9 w-9 shrink-0 select-none', className)}
    />
  )
}
