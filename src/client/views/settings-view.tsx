import { Database, Settings } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/feedback/query-error'
import { BackupPanel } from '@/components/settings/backup-panel'
import { CatalogManager } from '@/components/settings/catalog-manager'
import { CurrencySettings } from '@/components/settings/currency-settings'
import { DangerZone } from '@/components/settings/danger-zone'
import { useSettings } from '@/lib/queries'

/** Catálogo maestro, moneda y respaldos locales. */
export function SettingsView() {
  const { data: settings, isLoading, isError, error, refetch } = useSettings()

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[1.6rem] font-medium tracking-[-0.035em]">Catálogo y ajustes</h2>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Configuración global de la aplicación y respaldos locales
          </p>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          <Settings className="h-3 w-3" />
          Los cambios se guardan en SQLite
        </span>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[240px] rounded-[2px]" />
          <Skeleton className="h-[360px] rounded-[2px]" />
          <Skeleton className="h-[220px] rounded-[2px]" />
        </div>
      ) : isError ? (
        <QueryError message={error?.message} onRetry={() => void refetch()} />
      ) : settings ? (
        <>
          <CurrencySettings settings={settings} />
          <CatalogManager />
          <BackupPanel />

          <div className="flex items-center gap-2 border border-border bg-card/60 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span className="font-mono">./data/finanzas.db</span>
            <span className="text-border">·</span>
            <span>SQLite local con WAL y claves foráneas activas</span>
          </div>

          <DangerZone />
        </>
      ) : null}
    </div>
  )
}
