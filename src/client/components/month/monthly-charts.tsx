import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/charts/chart-card'
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_GRID,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from '@/components/charts/theme'
import { formatCurrency, type CurrencyConfig } from '@/lib/format'
import type { MonthResponse } from '@/lib/queries'

export interface MonthlyChartsProps {
  data: MonthResponse
  config: CurrencyConfig
}

/** Las 3 gráficas mensuales del Excel (más el desglose por categoría). */
export function MonthlyCharts({ data, config }: MonthlyChartsProps) {
  const { totals } = data.summary

  const money = (value: unknown) => formatCurrency(Number(value), config)
  const compact = (value: unknown) =>
    new Intl.NumberFormat(config.locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Number(value))

  const incomeRows = data.incomes.map((row) => ({
    name: row.name,
    Esperado: row.expectedAmount,
    Real: row.actualAmount,
  }))

  const slices = [
    { name: 'Facturas', value: totals.bills.actual, color: CHART_COLORS.bills },
    { name: 'Gastos', value: totals.expenses.actual, color: CHART_COLORS.expenses },
    { name: 'Ahorros', value: totals.savings.actual, color: CHART_COLORS.savings },
    { name: 'Deuda', value: totals.debts.actual, color: CHART_COLORS.debt },
  ]
  const totalOut = slices.reduce((total, slice) => total + slice.value, 0)

  const blockRows = [
    { name: 'Facturas', Presupuesto: totals.bills.budget, Real: totals.bills.actual },
    { name: 'Gastos', Presupuesto: totals.expenses.budget, Real: totals.expenses.actual },
    { name: 'Ahorros', Presupuesto: totals.savings.budget, Real: totals.savings.actual },
    { name: 'Deuda', Presupuesto: totals.debts.budget, Real: totals.debts.actual },
  ]
  const blocksEmpty = blockRows.every((row) => row.Presupuesto === 0 && row.Real === 0)

  const categoryRows = data.expenseCategories
    .filter((category) => category.budgetAmount !== 0 || category.actualAmount !== 0)
    .map((category) => ({
      name: category.name,
      Presupuesto: category.budgetAmount,
      Real: category.actualAmount,
    }))
  const maxCategoryName = categoryRows.reduce(
    (longest, row) => Math.max(longest, row.name.length),
    0,
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="label-caps text-foreground">Gráficas del mes</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Ingresos: esperado vs. real"
          subtitle="Comparación por fuente de ingreso"
          empty={incomeRows.length === 0}
          emptyMessage="Agrega fuentes de ingreso para ver la comparación"
        >
          <div style={{ height: Math.max(190, incomeRows.length * 44 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={incomeRows}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
                barGap={2}
              >
                <CartesianGrid horizontal={false} stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compact}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={money}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="Esperado" fill={CHART_COLORS.budget} barSize={10} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Real" fill={CHART_COLORS.income} barSize={10} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Distribución de salidas reales"
          subtitle="Facturas, gastos, ahorros y deuda"
          empty={totalOut === 0}
          emptyMessage="Registra montos reales para ver la distribución"
        >
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {slices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip formatter={money} contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Total
              </span>
              <span className="value-num text-xs">
                {formatCurrency(totalOut, config)}
              </span>
            </div>
          </div>

          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.06em]">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className="h-1.5 w-1.5"
                    style={{ backgroundColor: slice.color }}
                  />
                  {slice.name}
                </span>
                <span className="tabular-nums text-foreground/80">
                  {formatCurrency(slice.value, config)}
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Presupuesto vs. real por rubro"
          subtitle="Los 4 bloques de salida del mes"
          empty={blocksEmpty}
          emptyMessage="Sin presupuestos ni montos reales todavía"
        >
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blockRows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  width={62}
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compact}
                />
                <Tooltip
                  formatter={money}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar
                  dataKey="Presupuesto"
                  fill={CHART_COLORS.budget}
                  barSize={22}
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="Real" fill={CHART_COLORS.primary} barSize={22} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Presupuesto vs. real por categoría"
          subtitle="Detalle del bloque de gastos variables"
          empty={categoryRows.length === 0}
          emptyMessage="Define presupuestos o registra gastos por categoría"
        >
          <div style={{ height: Math.max(200, categoryRows.length * 30 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryRows}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
                barGap={2}
              >
                <CartesianGrid horizontal={false} stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={compact}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={Math.min(150, Math.max(90, maxCategoryName * 6.5))}
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={money}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="Presupuesto" fill={CHART_COLORS.budget} barSize={9} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Real" fill={CHART_COLORS.expenses} barSize={9} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  )
}
