import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ArrowRight,
  Plus,
  MapPin,
  Sprout,
} from 'lucide-react'
import { Card } from '../ui/Card.tsx'
import { Button } from '../ui/Button.tsx'
import { formatLKR } from '../../utils/calculations.ts'
import { formatDateDisplay } from '../../utils/date.ts'
import type { Transaction, Land, Crop, Category } from '../../data/db/schema.ts'

interface RecentTransactionsProps {
  transactions: Transaction[]
  lands: Land[]
  crops: Crop[]
  categories: Category[]
}

export const RecentTransactions = memo(function RecentTransactions({
  transactions,
  lands,
  crops,
  categories,
}: RecentTransactionsProps) {
  const navigate = useNavigate()

  const landMap = useMemo(() => new Map(lands.map((l) => [l.id, l.name])), [lands])
  const cropMap = useMemo(() => new Map(crops.map((c) => [c.id, c.name])), [crops])
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  return (
    <Card className="p-4 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-900/40 dark:text-forest-200">
              <Receipt size={19} />
            </div>
            <div>
              <h3 className="font-semibold text-text text-sm sm:text-base">Recent Transactions</h3>
              <p className="text-xs text-muted">Latest operational cash entries matching active filters</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              className="h-8 text-xs gap-1.5"
              onClick={() => navigate('/transactions')}
            >
              View All <ArrowRight size={13} />
            </Button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="grid h-52 place-items-center text-center p-6">
            <div className="grid size-12 place-items-center rounded-full bg-subtle text-muted mb-2">
              <Receipt size={22} />
            </div>
            <p className="text-sm font-medium text-text">No transactions logged</p>
            <p className="max-w-xs text-xs text-muted mt-1">
              No financial entries match your selected date or location filters.
            </p>
            <div className="mt-3">
              <Button size="default" className="h-8 text-xs gap-1" onClick={() => navigate('/transactions?action=add')}>
                <Plus size={14} /> Add Transaction
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Touch-Friendly Card List (< sm) */}
            <div className="mt-3 space-y-2.5 sm:hidden">
              {transactions.map((tx) => {
                const isIncome = tx.type === 'income'
                return (
                  <div
                    key={tx.id}
                    onClick={() => navigate('/transactions')}
                    className="rounded-xl border border-border bg-canvas p-3 transition-colors hover:border-forest-500/40 active:bg-subtle cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{formatDateDisplay(tx.date)}</span>
                      <span className="rounded-md bg-subtle px-2 py-0.5 text-[10px] font-medium text-text">
                        {catMap.get(tx.categoryId) || 'General'}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="font-semibold text-text text-sm line-clamp-1">
                        {tx.description}
                      </p>
                      <span
                        className={`inline-flex items-center gap-0.5 shrink-0 font-bold text-sm ${
                          isIncome
                            ? 'text-forest-600 dark:text-forest-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatLKR(tx.amount)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {landMap.get(tx.landId) || 'Estate'}
                      </span>
                      {tx.cropId && (
                        <span className="flex items-center gap-1">
                          <Sprout size={11} /> {cropMap.get(tx.cropId)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View (>= sm) */}
            <div className="mt-3 hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="py-2.5 font-medium">Date</th>
                    <th className="py-2.5 font-medium">Description</th>
                    <th className="py-2.5 font-medium">Land / Area</th>
                    <th className="py-2.5 font-medium">Crop</th>
                    <th className="py-2.5 font-medium">Category</th>
                    <th className="py-2.5 font-medium text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'income'
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => navigate('/transactions')}
                        className="cursor-pointer transition-colors hover:bg-subtle/60"
                        title="Click to view in Transactions manager"
                      >
                        <td className="py-3 font-medium text-text whitespace-nowrap">
                          {formatDateDisplay(tx.date)}
                        </td>
                        <td className="py-3 font-medium text-text max-w-[200px] truncate">
                          {tx.description}
                        </td>
                        <td className="py-3 text-muted whitespace-nowrap">
                          {landMap.get(tx.landId) || 'Estate'}
                        </td>
                        <td className="py-3 text-muted whitespace-nowrap">
                          {tx.cropId ? cropMap.get(tx.cropId) || '-' : '-'}
                        </td>
                        <td className="py-3 text-muted whitespace-nowrap">
                          <span className="rounded-md bg-subtle px-2 py-0.5 text-[11px] font-medium text-text">
                            {catMap.get(tx.categoryId) || 'General'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isIncome
                                ? 'text-forest-600 dark:text-forest-400'
                                : 'text-orange-600 dark:text-orange-400'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft size={13} className="shrink-0" />
                            ) : (
                              <ArrowUpRight size={13} className="shrink-0" />
                            )}
                            {isIncome ? '+' : '-'} {formatLKR(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3 flex items-center justify-between text-xs">
        <span className="text-muted">Viewing latest 5 matching records</span>
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-1 font-semibold text-forest-600 hover:text-forest-700 transition-colors cursor-pointer"
        >
          Open Transactions Ledger <ArrowRight size={13} />
        </button>
      </div>
    </Card>
  )
})
