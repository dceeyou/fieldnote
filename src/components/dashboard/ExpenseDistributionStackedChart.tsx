import { memo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card } from '../ui/Card.tsx'
import { Button } from '../ui/Button.tsx'
import { Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { formatLKR } from '../../utils/calculations.ts'
import type { MonthlyCategoryExpensePoint } from '../../domain/dashboard.ts'

interface ExpenseDistributionStackedChartProps {
  data: MonthlyCategoryExpensePoint[]
  categoryNames: string[]
}

const STACKED_PALETTE = [
  '#2b5134',
  '#ea580c',
  '#0284c7',
  '#d97706',
  '#16a34a',
  '#7c3aed',
  '#0d9488',
  '#e11d48',
  '#4f46e5',
  '#ca8a04',
  '#475569',
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
    return (
      <div className="rounded-lg border border-border bg-surface p-3 shadow-md text-xs max-w-xs">
        <p className="font-semibold text-text mb-1">{label} Breakdown</p>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {payload
            .filter((p) => Number(p.value) > 0)
            .map((entry) => (
              <div key={entry.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted truncate">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.name}:</span>
                </span>
                <span className="font-semibold text-text shrink-0">{formatLKR(entry.value)}</span>
              </div>
            ))}
        </div>
        <div className="mt-2 border-t border-border pt-1.5 flex justify-between font-bold text-text">
          <span>Total Monthly Expense:</span>
          <span>{formatLKR(total)}</span>
        </div>
      </div>
    )
  }
  return null
}

export const ExpenseDistributionStackedChart = memo(function ExpenseDistributionStackedChart({
  data,
  categoryNames,
}: ExpenseDistributionStackedChartProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (categoryNames.length === 0 || data.length === 0) {
    return null
  }

  return (
    <Card className="p-5 sm:p-6 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-text">Monthly Expense Distribution by Category</h3>
            <p className="text-xs text-muted">
              Secondary analysis showing how cost allocations evolve across months
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="default"
          className="h-8 text-xs gap-1.5"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? (
            <>
              Hide Distribution <ChevronUp size={13} />
            </>
          ) : (
            <>
              Show Distribution <ChevronDown size={13} />
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />
                {categoryNames.map((catName, idx) => (
                  <Bar
                    key={catName}
                    dataKey={catName}
                    name={catName}
                    stackId="expenses"
                    fill={STACKED_PALETTE[idx % STACKED_PALETTE.length]}
                    maxBarSize={45}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  )
})
