import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MONTH_SHORT_NAMES_ES } from '@shared/calculations'
import type { AnnualSeries } from '@shared/types'
import { ChartCard } from '@/components/charts/chart-card'
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_GRID,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  compactNumberFormatter,
  currencyTooltipFormatter,
} from '@/components/charts/theme'
import type { CurrencyConfig } from '@/lib/format'

export interface AnnualChartsProps {
  series: AnnualSeries
  config: CurrencyConfig
}

function byMonth(values: number[]): Array<{ name: string; value: number }> {
  return MONTH_SHORT_NAMES_ES.map((name, index) => ({
    name,
    value: values[index] ?? 0,
  }))
}

/** Las 4 gráficas anuales de la `Plantilla Anual`. */
export function AnnualCharts({ series, config }: AnnualChartsProps) {
  const compact = compactNumberFormatter(config.locale)
  const money = currencyTooltipFormatter(config)

  const income = byMonth(series.income)
  const spend = byMonth(series.billsAndExpenses)
  const remaining = byMonth(series.remaining)
  const savings = byMonth(series.savings)

  const isEmpty = (rows: Array<{ value: number }>) => rows.every((row) => row.value === 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard
        title="Ingresos totales por mes"
        subtitle="Ingresos reales del año"
        empty={isEmpty(income)}
        emptyMessage="Aún no hay ingresos reales registrados"
      >
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={income} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
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
              <Bar
                dataKey="value"
                name="Ingresos"
                fill={CHART_COLORS.income}
                barSize={16}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Facturas + gastos por mes"
        subtitle="Salidas reales del año"
        empty={isEmpty(spend)}
        emptyMessage="Aún no hay facturas ni gastos reales"
      >
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spend} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="annual-spend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.expenses} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART_COLORS.expenses} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                width={62}
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={compact}
              />
              <Tooltip formatter={money} contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
              <Area
                type="monotone"
                dataKey="value"
                name="Facturas + gastos"
                stroke={CHART_COLORS.expenses}
                strokeWidth={2}
                fill="url(#annual-spend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Cantidad que queda por mes"
        subtitle="Ingreso real − facturas − gastos"
        empty={isEmpty(remaining)}
        emptyMessage="Sin remanente operativo todavía"
      >
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={remaining} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
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
              <Bar dataKey="value" name="Restante" barSize={16} radius={[4, 4, 0, 0]}>
                {remaining.map((row) => (
                  <Cell
                    key={row.name}
                    fill={row.value < 0 ? CHART_COLORS.negative : CHART_COLORS.primary}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Ahorros totales por mes"
        subtitle="Ahorro real acumulado mes a mes"
        empty={isEmpty(savings)}
        emptyMessage="Aún no hay ahorros reales registrados"
      >
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={savings} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                width={62}
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={compact}
              />
              <Tooltip formatter={money} contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
              <Line
                type="monotone"
                dataKey="value"
                name="Ahorros"
                stroke={CHART_COLORS.savings}
                strokeWidth={2}
                dot={{ r: 2.5, fill: CHART_COLORS.savings, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  )
}
