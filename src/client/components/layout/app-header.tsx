import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/layout/brand-logo'
import { UiScaleSelector } from '@/components/layout/ui-scale-selector'
import { YearSelector } from '@/components/layout/year-selector'
import { useHealth } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { APP_VERSION_LABEL } from '@/lib/version'

export interface AppHeaderProps {
  year: number
  onYearChange: (year: number) => void
  onOpenSettings: () => void
  settingsActive: boolean
  uiScale: number
  onUiScaleChange: (value: number) => void
}

/** Cabecera: wordmark, estado local, año fiscal, escala de interfaz y ajustes. */
export function AppHeader({
  year,
  onYearChange,
  onOpenSettings,
  settingsActive,
  uiScale,
  onUiScaleChange,
}: AppHeaderProps) {
  const health = useHealth()
  const online = health.isSuccess && health.data?.status === 'ok'
  const checking = health.isLoading

  const statusLabel = checking ? 'Conectando' : online ? 'Local · SQLite' : 'Sin conexión'

  return (
    <header className="border-b border-border/80 bg-background/95">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[13px] font-semibold uppercase leading-tight tracking-[0.18em] text-foreground">
                Presupuesto <span className="text-primary">Personal</span>
              </h1>
              <span
                className="shrink-0 border border-border/70 px-1.5 py-0.5 font-mono text-[9px] leading-none tracking-[0.06em] text-muted-foreground"
                title={`Versión ${APP_VERSION_LABEL}`}
              >
                {APP_VERSION_LABEL}
              </span>
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
              Registro local · SQLite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            title={online ? health.data?.path : undefined}
            className="hidden items-center gap-2 border-r border-border/70 pr-3 sm:flex"
          >
            <span
              className={cn(
                'h-1.5 w-1.5',
                checking
                  ? 'bg-muted-foreground/50'
                  : online
                    ? 'bg-income'
                    : 'bg-destructive',
              )}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {statusLabel}
            </span>
          </span>

          <YearSelector value={year} onChange={onYearChange} />

          <UiScaleSelector value={uiScale} onChange={onUiScaleChange} />

          <Button
            variant={settingsActive ? 'secondary' : 'outline'}
            size="icon"
            onClick={onOpenSettings}
            aria-label="Catálogo y ajustes"
            title="Catálogo y ajustes"
            className="h-8 w-8"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
