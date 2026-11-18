import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '../ui/Card.tsx'
import { formatLKR } from '../../utils/calculations.ts'
import type { MonthlyComparisonPoint } from '../../domain/dashboard.ts'

interface IncomeExpenseBarChartProps {
  data: MonthlyComparisonPoint[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3 shadow-md text-xs">
        <p className="font-semibold text-text mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold text-text">{formatLKR(entry.value)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 border-t border-border pt-1 text-[11px] text-muted">
          Click bar to view transactions for this month
        </p>
      </div>
    )
  }
  return null
}

export const IncomeExpenseBarChart = memo(function IncomeExpenseBarChart({
  data,
}: IncomeExpenseBarChartProps) {
  const navigate = useNavigate()

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-text">Monthly Income vs Expenses</h3>
            <p className="text-xs text-muted">
              Comparison of cash inflows and operational outflows across selected months
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-forest-600" />
              <span className="text-muted">Income</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-orange-500" />
              <span className="text-muted">Expenses</span>
            </span>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="grid h-64 place-items-center text-xs text-muted">
            No transactions found for the selected timeframe.
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                onClick={(e: unknown) => {
                  const ev = e as { activePayload?: Array<{ payload: MonthlyComparisonPoint }> }
                  if (ev?.activePayload?.length) {
                    const point = ev.activePayload[0].payload
                    if (point.monthKey) {
                      navigate(`/transactions?month=${point.monthKey}`)
                    }
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="monthLabel"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
                    return `${val}`
                  }}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#2b5134"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#ea580c"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted text-center border-t border-border pt-2">
        Tip: Click on any month bar to open its filtered transactions.
      </p>
    </Card>
  )
})
