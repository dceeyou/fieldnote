import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '../ui/Card.tsx'
import { formatLKR } from '../../utils/calculations.ts'
import type { CategoryBreakdownItem } from '../../domain/dashboard.ts'

interface ExpenseCategoryDonutChartProps {
  data: CategoryBreakdownItem[]
  totalExpenses: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: CategoryBreakdownItem
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload
    return (
      <div className="rounded-lg border border-border bg-surface p-3 shadow-md text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-text">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
        </div>
        <div className="mt-1.5 space-y-0.5">
          <p className="text-text font-bold text-sm">{formatLKR(item.amount)}</p>
          <p className="text-muted text-[11px]">{item.percentage}% of total expenses</p>
        </div>
        <p className="mt-2 border-t border-border pt-1 text-[10px] text-muted">
          Click slice to filter transactions
        </p>
      </div>
    )
  }
  return null
}

export const ExpenseCategoryDonutChart = memo(function ExpenseCategoryDonutChart({
  data,
  totalExpenses,
}: ExpenseCategoryDonutChartProps) {
  const navigate = useNavigate()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-semibold text-text">Expense Category Breakdown</h3>
            <p className="text-xs text-muted">Distribution of cultivation costs by category</p>
          </div>
          <span className="rounded-md bg-subtle px-2 py-1 text-[11px] font-medium text-muted">
            {data.length} {data.length === 1 ? 'Category' : 'Categories'}
          </span>
        </div>

        {data.length === 0 ? (
          <div className="grid h-64 place-items-center text-xs text-muted">
            No expense records logged for the selected period.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 pt-2">
            {/* Donut Chart with Centered Total */}
            <div className="relative h-60 w-full md:col-span-7">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2}
                    onClick={(_, index) => {
                      const item = data[index]
                      if (item?.id) {
                        navigate(`/transactions?categoryId=${item.id}`)
                      }
                    }}
                    className="cursor-pointer"
                    onMouseEnter={(_, index) => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={entry.color}
                        stroke="var(--surface)"
                        strokeWidth={hoveredIndex === index ? 3 : 1.5}
                        opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.6}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Total
                </span>
                <span className="text-sm font-bold text-text max-w-[100px] truncate">
                  {formatLKR(totalExpenses)}
                </span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="md:col-span-5 max-h-56 overflow-y-auto space-y-2 pr-1">
              {data.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/transactions?categoryId=${item.id}`)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`w-full flex items-center justify-between rounded-lg p-2 text-xs transition-colors text-left ${
                    hoveredIndex === index
                      ? 'bg-subtle text-text font-medium'
                      : 'hover:bg-subtle/50 text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-text font-medium">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-text font-semibold">{item.percentage}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted text-center border-t border-border pt-2">
        Tip: Click any slice or category name to inspect associated transactions.
      </p>
    </Card>
  )
})
