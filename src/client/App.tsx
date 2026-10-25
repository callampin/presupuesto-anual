import { useEffect } from 'react'
import { AppHeader } from '@/components/layout/app-header'
import { MainNav } from '@/components/layout/main-nav'
import { useActiveYear } from '@/hooks/use-active-year'
import { useCurrentMonth } from '@/hooks/use-current-month'
import { useUiScale } from '@/hooks/use-ui-scale'
import { useViewRoute } from '@/hooks/use-view-route'
import { useSettings, useYears } from '@/lib/queries'
import { AnnualView } from '@/views/annual-view'
import { CompoundCalcView } from '@/views/compound-calc-view'
import { MonthlyView } from '@/views/monthly-view'
import { SettingsView } from '@/views/settings-view'

export default function App() {
  const { route, navigate } = useViewRoute()
  const { data: settings } = useSettings()
  const { data: years } = useYears()
  const { year, setYear } = useActiveYear(settings?.defaultYear)
  const currentMonth = useCurrentMonth()
  const { percent: uiScale, setPercent: setUiScale } = useUiScale()

  // Si el año guardado ya no existe, cae al año más reciente disponible.
  useEffect(() => {
    if (!years || years.length === 0) return
    if (years.some((row) => row.year === year)) return
    const latest = years[0]
    if (latest) setYear(latest.year)
  }, [years, year, setYear])

  const month = route.month ?? currentMonth

  return (
    <div className="flex min-h-full flex-col bg-background">
      <AppHeader
        year={year}
        onYearChange={setYear}
        onOpenSettings={() => navigate({ view: 'settings', month: null })}
        settingsActive={route.view === 'settings'}
        uiScale={uiScale}
        onUiScaleChange={setUiScale}
      />

      <MainNav route={route} onNavigate={navigate} />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {route.view === 'annual' ? (
          <AnnualView
            year={year}
            onOpenMonth={(month) => navigate({ view: 'month', month })}
          />
        ) : null}
        {route.view === 'month' ? <MonthlyView year={year} month={month} /> : null}
        {route.view === 'compound' ? <CompoundCalcView /> : null}
        {route.view === 'settings' ? <SettingsView /> : null}
      </main>

      <footer className="border-t border-border/70 py-4">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Presupuesto Personal · Registro local</span>
          <span>SQLite · ./data/finanzas.db</span>
        </div>
      </footer>
    </div>
  )
}
