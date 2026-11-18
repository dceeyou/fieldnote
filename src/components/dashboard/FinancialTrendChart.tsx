import { memo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '../ui/Card.tsx'
import { formatLKR } from '../../utils/calculations.ts'
import type { TrendPoint } from '../../domain/dashboard.ts'

interface FinancialTrendChartProps {
  data: TrendPoint[]
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
      </div>
    )
  }
  return null
}

export const FinancialTrendChart = memo(function FinancialTrendChart({
  data,
}: FinancialTrendChartProps) {
  const [showIncome, setShowIncome] = useState(true)
  const [showExpenses, setShowExpenses] = useState(true)

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-text">Income & Expense Trend</h3>
            <p className="text-xs text-muted">
              Monthly cash flow trajectory over the active reporting period
            </p>
          </div>

          {/* Visibility Controls */}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setShowIncome((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-opacity ${
                showIncome ? 'opacity-100 font-medium' : 'opacity-40 line-through'
              }`}
            >
              <span className="size-2.5 rounded-full bg-forest-600" />
              <span className="text-text">Income</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExpenses((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-opacity ${
                showExpenses ? 'opacity-100 font-medium' : 'opacity-40 line-through'
              }`}
            >
              <span className="size-2.5 rounded-full bg-orange-500" />
              <span className="text-text">Expenses</span>
            </button>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="grid h-64 place-items-center text-xs text-muted">
            No trend points available for the selected range.
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="label"
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
                {showIncome && (
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#2b5134"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#2b5134', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#2b5134', stroke: 'var(--surface)', strokeWidth: 2 }}
                  />
                )}
                {showExpenses && (
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ea580c"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#ea580c', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#ea580c', stroke: 'var(--surface)', strokeWidth: 2 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted text-center border-t border-border pt-2">
        Tip: Click the badges in the top right to toggle individual series.
      </p>
    </Card>
  )
})
