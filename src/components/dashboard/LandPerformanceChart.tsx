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
import { MapPin } from 'lucide-react'
import { formatLKR } from '../../utils/calculations.ts'
import type { LandPerformanceItem } from '../../domain/dashboard.ts'

interface LandPerformanceChartProps {
  data: LandPerformanceItem[]
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
    const incomeEntry = payload.find((p) => p.dataKey === 'income')
    const expenseEntry = payload.find((p) => p.dataKey === 'expenses')
    const inc = incomeEntry?.value || 0
    const exp = expenseEntry?.value || 0
    const net = inc - exp

    return (
      <div className="rounded-lg border border-border bg-surface p-3 shadow-md text-xs">
        <p className="font-semibold text-text mb-1">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Income:</span>
            <span className="font-semibold text-forest-600">{formatLKR(inc)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Expenses:</span>
            <span className="font-semibold text-orange-600">{formatLKR(exp)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-1">
            <span className="text-muted">Net Balance:</span>
            <span className={`font-bold ${net >= 0 ? 'text-forest-600' : 'text-red-600'}`}>
              {formatLKR(net)}
            </span>
          </div>
        </div>
        <p className="mt-2 border-t border-border pt-1 text-[10px] text-muted">
          Click bar to view transactions for this land
        </p>
      </div>
    )
  }
  return null
}

export function LandPerformanceChart({ data }: LandPerformanceChartProps) {
  const navigate = useNavigate()

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-900/40 dark:text-forest-200">
              <MapPin size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-text">Land-wise Financial Performance</h3>
              <p className="text-xs text-muted">
                Financial return and operational costs across cultivation lands
              </p>
            </div>
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
          <div className="grid h-64 place-items-center text-center p-6">
            <div className="grid size-12 place-items-center rounded-full bg-subtle text-muted mb-2">
              <MapPin size={22} />
            </div>
            <p className="text-sm font-medium text-text">No land records found</p>
            <p className="max-w-xs text-xs text-muted mt-1">
              Add your estates and cultivation plots in Cultivation Lands.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                onClick={(e: unknown) => {
                  const ev = e as { activePayload?: Array<{ payload: LandPerformanceItem }> }
                  if (ev?.activePayload?.length) {
                    const point = ev.activePayload[0].payload
                    if (point.landId) {
                      navigate(`/transactions?landId=${point.landId}`)
                    }
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
                    return `${val}`
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="landName"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 500 }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#2b5134"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#ea580c"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted text-center border-t border-border pt-2">
        Tip: Click any land bar to view all operations and general expenses for that estate.
      </p>
    </Card>
  )
}
