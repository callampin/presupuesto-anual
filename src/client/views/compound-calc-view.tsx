import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildCompoundProjection } from '@shared/calculations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartCard } from '@/components/charts/chart-card'
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_GRID,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  compactNumberFormatter,
  currencyTooltipFormatter,
} from '@/components/charts/theme'
import { EditableCurrencyCell } from '@/components/financial/editable-currency-cell'
import { AmountInput } from '@/components/financial/amount-input'
import { KpiCard } from '@/components/financial/kpi-card'
import { formatCurrency, formatPercent, parseAmountInput } from '@/lib/format'
import {
  annualRateToMonthly,
  monthsToYearsValue,
  monthlyRateToAnnualPercent,
  roundDecimal,
  yearsLabelFromMonths,
  yearsToMonths,
} from '@/lib/compound'
import { useCurrencyConfig } from '@/hooks/use-currency-config'
import {
  useCreateSimulation,
  useDeleteSimulation,
  useSimulations,
  useUpdateSimulation,
  type SimulationInput,
  type SimulationRow,
} from '@/lib/queries'
import { cn } from '@/lib/utils'

const DEFAULT_CAPITAL = 5000
const DEFAULT_ANNUAL_RATE = 7
const DEFAULT_YEARS = '2'

function withdrawalsSnapshot(withdrawals: Record<number, number>): string {
  return Object.keys(withdrawals)
    .map(Number)
    .sort((a, b) => a - b)
    .map((month) => `${month}:${withdrawals[month]}`)
    .join('|')
}

function snapshotOf(
  name: string,
  capital: string,
  annualRate: string,
  years: string,
  contribution: string,
  withdrawals: Record<number, number>,
): string {
  return [
    name,
    capital,
    annualRate,
    years,
    contribution,
    withdrawalsSnapshot(withdrawals),
  ].join('::')
}

/** Calculadora de interés compuesto con escenarios guardados y retiros por mes. */
export function CompoundCalcView() {
  const config = useCurrencyConfig()
  const simulations = useSimulations()
  const createSimulation = useCreateSimulation()
  const updateSimulation = useUpdateSimulation()
  const deleteSimulation = useDeleteSimulation()

  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [scenarioName, setScenarioName] = useState('Nuevo escenario')
  const [initialCapital, setInitialCapital] = useState(String(DEFAULT_CAPITAL))
  const [annualRate, setAnnualRate] = useState(String(DEFAULT_ANNUAL_RATE))
  const [years, setYears] = useState(DEFAULT_YEARS)
  const [monthlyContribution, setMonthlyContribution] = useState('0')
  const [withdrawals, setWithdrawals] = useState<Record<number, number>>({})

  const [formError, setFormError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const autoLoaded = useRef(false)
  const baseline = useRef(
    snapshotOf(
      'Nuevo escenario',
      String(DEFAULT_CAPITAL),
      String(DEFAULT_ANNUAL_RATE),
      DEFAULT_YEARS,
      '0',
      {},
    ),
  )

  function currentSnapshot(): string {
    return snapshotOf(
      scenarioName,
      initialCapital,
      annualRate,
      years,
      monthlyContribution,
      withdrawals,
    )
  }

  function confirmDiscard(): boolean {
    if (currentSnapshot() === baseline.current) return true
    return window.confirm(
      'Tienes cambios sin guardar en este escenario. ¿Quieres descartarlos?',
    )
  }

  function loadScenario(scenario: SimulationRow): void {
    const nextWithdrawals: Record<number, number> = Object.fromEntries(
      Object.entries(scenario.withdrawals).map(([month, amount]) => [Number(month), amount]),
    )
    const annualValue = String(roundDecimal(monthlyRateToAnnualPercent(scenario.monthlyRate), 4))
    const yearsValue = monthsToYearsValue(scenario.months)

    setSelectedId(scenario.id)
    setScenarioName(scenario.name)
    setInitialCapital(String(scenario.initialCapital))
    setAnnualRate(annualValue)
    setYears(yearsValue)
    setMonthlyContribution(String(scenario.monthlyContribution))
    setWithdrawals(nextWithdrawals)
    setFormError(null)
    baseline.current = snapshotOf(
      scenario.name,
      String(scenario.initialCapital),
      annualValue,
      yearsValue,
      String(scenario.monthlyContribution),
      nextWithdrawals,
    )
  }

  function startNewScenario(): void {
    setSelectedId('new')
    setScenarioName('Nuevo escenario')
    setInitialCapital(String(DEFAULT_CAPITAL))
    setAnnualRate(String(DEFAULT_ANNUAL_RATE))
    setYears(DEFAULT_YEARS)
    setMonthlyContribution('0')
    setWithdrawals({})
    setFormError(null)
    baseline.current = snapshotOf(
      'Nuevo escenario',
      String(DEFAULT_CAPITAL),
      String(DEFAULT_ANNUAL_RATE),
      DEFAULT_YEARS,
      '0',
      {},
    )
  }

  useEffect(() => {
    if (autoLoaded.current || !simulations.data) return
    autoLoaded.current = true
    const first = simulations.data[0]
    if (first) loadScenario(first)
    else startNewScenario()
    // Solo se ejecuta la primera vez que llegan los escenarios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulations.data])

  useEffect(() => {
    setSaveNotice(null)
  }, [scenarioName, initialCapital, annualRate, years, monthlyContribution, withdrawals])

  const capitalValue = parseAmountInput(initialCapital)
  const parsedAnnualRate = Number(annualRate.replace(',', '.'))
  const parsedYears = Number(years.replace(',', '.'))
  const parsedMonths = Number.isFinite(parsedYears) ? yearsToMonths(parsedYears) : 0
  const monthlyRate = annualRateToMonthly(parsedAnnualRate)
  const contributionValue = parseAmountInput(monthlyContribution)

  const paramsValid =
    capitalValue !== null &&
    Number.isFinite(parsedAnnualRate) &&
    parsedAnnualRate > -100 &&
    parsedAnnualRate <= 1000 &&
    Number.isFinite(parsedYears) &&
    parsedYears > 0 &&
    parsedMonths >= 1 &&
    parsedMonths <= 1200 &&
    contributionValue !== null &&
    Number.isFinite(monthlyRate)

  const projection = useMemo(() => {
    if (!paramsValid || capitalValue === null || contributionValue === null) return null
    return buildCompoundProjection({
      initialCapital: capitalValue,
      monthlyRate,
      months: parsedMonths,
      monthlyContribution: contributionValue,
      withdrawals,
    })
  }, [
    paramsValid,
    capitalValue,
    contributionValue,
    monthlyRate,
    parsedMonths,
    withdrawals,
  ])

  const chartData = useMemo(() => {
    if (!projection || capitalValue === null || contributionValue === null) return []
    let withdrawnSoFar = 0
    return projection.rows.map((row) => {
      withdrawnSoFar += row.withdrawal
      return {
        name: `M${row.month}`,
        Aportado: capitalValue + contributionValue * row.month - withdrawnSoFar,
        Total: row.totalCapital,
      }
    })
  }, [projection, capitalValue, contributionValue])

  const money = currencyTooltipFormatter(config)
  const compact = compactNumberFormatter(config.locale)

  function buildPayload(): SimulationInput | null {
    if (!paramsValid || capitalValue === null || contributionValue === null) {
      setFormError(
        'Revisa los parámetros: capital, tasa anual mayor a -100% y un plazo en años válido.',
      )
      return null
    }
    if (scenarioName.trim() === '') {
      setFormError('El escenario necesita un nombre.')
      return null
    }

    const filteredWithdrawals = Object.fromEntries(
      Object.entries(withdrawals)
        .filter(([month]) => Number(month) <= parsedMonths)
        .map(([month, amount]) => [month, amount]),
    )

    return {
      name: scenarioName.trim(),
      initialCapital: capitalValue,
      monthlyRate,
      months: parsedMonths,
      monthlyContribution: contributionValue,
      withdrawals: filteredWithdrawals,
    }
  }

  function handleSave() {
    const payload = buildPayload()
    if (!payload) return
    setFormError(null)
    setSaveNotice(null)

    if (selectedId !== null && selectedId !== 'new') {
      updateSimulation.mutate(
        { id: selectedId, patch: payload },
        {
          onSuccess: () => {
            setScenarioName(payload.name)
            baseline.current = snapshotOf(
              payload.name,
              initialCapital,
              annualRate,
              years,
              monthlyContribution,
              withdrawals,
            )
            setSaveNotice('Escenario actualizado')
          },
          onError: (error) =>
            setFormError(error instanceof Error ? error.message : 'No se pudo guardar'),
        },
      )
      return
    }

    createSimulation.mutate(payload, {
      onSuccess: (scenario) => {
        setSelectedId(scenario.id)
        setScenarioName(payload.name)
        baseline.current = snapshotOf(
          payload.name,
          initialCapital,
          annualRate,
          years,
          monthlyContribution,
          withdrawals,
        )
        setSaveNotice('Escenario guardado')
      },
      onError: (error) =>
        setFormError(error instanceof Error ? error.message : 'No se pudo guardar'),
    })
  }

  function handleDelete() {
    if (selectedId === null || selectedId === 'new') return
    if (!window.confirm('¿Eliminar este escenario guardado?')) return
    deleteSimulation.mutate(selectedId, {
      onSuccess: () => startNewScenario(),
      onError: (error) =>
        setFormError(error instanceof Error ? error.message : 'No se pudo eliminar'),
    })
  }

  const saving = createSimulation.isPending || updateSimulation.isPending

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[1.6rem] font-medium tracking-[-0.035em]">Ahorro e interés compuesto</h2>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Simulador independiente del presupuesto mensual
          </p>
        </div>
        {projection ? (
          <Badge variant="savings">
            {yearsLabelFromMonths(parsedMonths)} · {projection.rows.length} meses
          </Badge>
        ) : null}
      </header>

      <Card className="plot-panel p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Capital inicial
            </span>
            <AmountInput
              value={initialCapital}
              onValueChange={setInitialCapital}
              maxDecimals={Math.max(config.decimalPlaces, 2)}
              className="text-right tabular-nums"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tasa anual efectiva (%)
            </span>
            <AmountInput
              value={annualRate}
              onValueChange={setAnnualRate}
              maxDecimals={4}
              className="text-right tabular-nums"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Plazo (años)
            </span>
            <Input
              value={years}
              onChange={(event) => {
                const cleaned = event.target.value
                  .replace(',', '.')
                  .replace(/[^\d.]/g, '')
                  .replace(/(\..*)\./g, '$1')
                if (event.target.value !== cleaned) event.target.value = cleaned
                setYears(cleaned)
              }}
              inputMode="decimal"
              maxLength={6}
              className="text-right tabular-nums"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Aportación mensual
            </span>
            <AmountInput
              value={monthlyContribution}
              onValueChange={setMonthlyContribution}
              maxDecimals={Math.max(config.decimalPlaces, 2)}
              className="text-right tabular-nums"
            />
          </label>
        </div>

        {paramsValid ? (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {yearsLabelFromMonths(parsedMonths)} = {parsedMonths} meses · tasa mensual equivalente{' '}
            {formatPercent(monthlyRate, 4)}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Select
              value={selectedId === null ? 'new' : String(selectedId)}
              onChange={(event) => {
                if (!confirmDiscard()) return
                const value = event.target.value
                if (value === 'new') {
                  startNewScenario()
                  return
                }
                const scenario = simulations.data?.find((row) => row.id === Number(value))
                if (scenario) loadScenario(scenario)
              }}
              aria-label="Escenario guardado"
              disabled={simulations.isLoading}
            >
              <option value="new">Nuevo escenario</option>
              {simulations.data?.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            value={scenarioName}
            onChange={(event) => setScenarioName(event.target.value)}
            placeholder="Nombre del escenario"
            aria-label="Nombre del escenario"
            className="lg:w-64"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirmDiscard()) startNewScenario()
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !paramsValid}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={selectedId === null || selectedId === 'new'}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </Button>
          </div>
        </div>

        {formError ? <p className="mt-2 text-[11px] text-destructive">{formError}</p> : null}
        {saveNotice ? <p className="mt-2 text-[11px] text-income">{saveNotice}</p> : null}
        {simulations.isError ? (
          <p className="mt-2 text-[11px] text-destructive">
            No se pudieron cargar los escenarios guardados.
          </p>
        ) : null}
        {!paramsValid ? (
          <p className="mt-2 text-[11px] text-expenses">
            Completa capital, una tasa anual mayor a −100% y un plazo en años entre 0.08 y 100
            (1 a 1,200 meses).
          </p>
        ) : null}
      </Card>

      {projection ? (
        <>
          <div className="plot-panel grid grid-cols-1 gap-px overflow-hidden bg-border/60 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Capital final"
              value={projection.finalCapital}
              config={config}
              accent="savings"
              hint={`Al mes ${projection.rows.length} · ${yearsLabelFromMonths(parsedMonths)}`}
            />
            <KpiCard
              label="Capital aportado"
              value={projection.totalContributed}
              config={config}
              accent="primary"
              hint="Inicial + aportaciones"
            />
            <KpiCard
              label="Retiros"
              value={projection.totalWithdrawn}
              config={config}
              accent="debt"
              hint="Suma de retiros simulados"
            />
            <KpiCard
              label="Rendimientos"
              value={projection.totalGains}
              config={config}
              accent="income"
              hint="Interés compuesto generado"
            />
          </div>

          <ChartCard
            title="Proyección del capital"
            subtitle={`Capital aportado neto vs. capital con interés compuesto (${yearsLabelFromMonths(parsedMonths)})`}
            empty={chartData.length === 0}
          >
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="compound-total" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.savings} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS.savings} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={CHART_AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    width={66}
                    tick={CHART_AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={compact}
                  />
                  <Tooltip formatter={money} contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="Total"
                    name="Capital total"
                    stroke={CHART_COLORS.savings}
                    strokeWidth={2}
                    fill="url(#compound-total)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Aportado"
                    name="Capital aportado"
                    stroke={CHART_COLORS.budget}
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <Card className="plot-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Detalle mes a mes</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Edita la columna Retiros para simular un retiro en cualquier mes.
                </p>
              </div>
              <Badge variant="outline">
                Tasa {parsedAnnualRate.toLocaleString('es')}% anual ·{' '}
                {yearsLabelFromMonths(parsedMonths)}
              </Badge>
            </div>

            <div className="mt-3 max-h-[460px] overflow-y-auto rounded-[2px] border border-border/60">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-12 px-2 text-[10px]">Mes</TableHead>
                    <TableHead className="px-2 text-right text-[10px]">Capital</TableHead>
                    <TableHead className="px-2 text-right text-[10px]">Rendimiento</TableHead>
                    <TableHead className="px-2 text-right text-[10px]">Aporte</TableHead>
                    <TableHead className="px-2 text-right text-[10px]">Nuevo capital</TableHead>
                    <TableHead className="px-2 text-right text-[10px]">Retiros</TableHead>
                    <TableHead className="px-2 text-right text-[10px]">Capital total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projection.rows.map((row) => (
                    <TableRow
                      key={row.month}
                      className={cn('border-border/40', row.withdrawal !== 0 && 'bg-debt/5')}
                    >
                      <TableCell className="px-2 py-1 text-xs tabular-nums text-muted-foreground">
                        {row.month}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-xs tabular-nums">
                        {formatCurrency(row.capital, config)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-xs tabular-nums text-income">
                        {formatCurrency(row.gain, config)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(row.contribution, config)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-xs tabular-nums">
                        {formatCurrency(row.newCapital, config)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                        <EditableCurrencyCell
                          value={row.withdrawal}
                          config={config}
                          ariaLabel={`Retiro del mes ${row.month}`}
                          onCommit={(value) =>
                            setWithdrawals((previous) => {
                              const next = { ...previous }
                              if (value === 0) delete next[row.month]
                              else next[row.month] = value
                              return next
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-xs font-medium tabular-nums">
                        {formatCurrency(row.totalCapital, config)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="px-2 py-1.5 text-[11px]">
                      Totales
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums">
                      {formatCurrency(projection.totalWithdrawn, config)}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right text-xs font-semibold tabular-nums">
                      {formatCurrency(projection.finalCapital, config)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Ajusta los parámetros para ver la proyección.
        </Card>
      )}
    </div>
  )
}
