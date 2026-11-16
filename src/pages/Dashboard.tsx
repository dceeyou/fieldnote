import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  Plus,
  Leaf,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { getTransactions } from '../services/transactionService.ts'
import {
  getActiveScheduledApplications,
  markApplicationCompleted,
} from '../services/fertilizerApplicationService.ts'
import { getAllLands } from '../services/landService.ts'
import { getAllCrops } from '../services/cropService.ts'
import { getAllFertilizers } from '../services/fertilizerService.ts'
import { getAllCategories } from '../services/categoryService.ts'
import type { Transaction, FertilizerApplication, Land, Crop, Fertilizer, Category } from '../data/db/schema.ts'
import {
  calculateFinancialSummary,
  formatLKR,
} from '../utils/calculations.ts'
import {
  getTodayColombo,
  getCurrentMonthColombo,
  formatDateDisplay,
} from '../utils/date.ts'
import { evaluateFertilizerReminders } from '../utils/reminders.ts'

export function Dashboard() {
  const navigate = useNavigate()
  const today = getTodayColombo()
  const currentMonth = getCurrentMonthColombo()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [scheduledApps, setScheduledApps] = useState<FertilizerApplication[]>([])
  const [lands, setLands] = useState<Land[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  async function loadDashboardData() {
    setLoading(true)
    try {
      const [allTx, allApps, allLands, allCrops, allFerts, allCats] = await Promise.all([
        getTransactions(),
        getActiveScheduledApplications(),
        getAllLands(true),
        getAllCrops(true),
        getAllFertilizers(true),
        getAllCategories(true),
      ])
      setTransactions(allTx)
      setScheduledApps(allApps)
      setLands(allLands)
      setCrops(allCrops)
      setFertilizers(allFerts)
      setCategories(allCats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Maps for quick symbol lookups
  const landMap = useMemo(() => new Map(lands.map((l) => [l.id, l.name])), [lands])
  const cropMap = useMemo(() => new Map(crops.map((c) => [c.id, c.name])), [crops])
  const fertMap = useMemo(() => new Map(fertilizers.map((f) => [f.id, f.name])), [fertilizers])
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth))
  }, [transactions, selectedMonth])

  const summary = useMemo(() => calculateFinancialSummary(monthTransactions), [monthTransactions])

  // Real-time derived reminders
  const reminders = useMemo(() => {
    return evaluateFertilizerReminders(scheduledApps, today)
  }, [scheduledApps, today])

  const overdueReminders = reminders.filter((r) => r.status === 'overdue')
  const dueTodayReminders = reminders.filter((r) => r.status === 'due_today')
  const dueSoonReminders = reminders.filter((r) => r.status === 'due_soon')
  const activeAlerts = [...overdueReminders, ...dueTodayReminders, ...dueSoonReminders]

  const recentTransactions = transactions.slice(0, 5)

  async function handleQuickComplete(appId: string) {
    await markApplicationCompleted(appId, today)
    await loadDashboardData()
  }

  // Format header dates
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  }).format(new Date())

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  }).format(new Date(`${selectedMonth}-01`))

  return (
    <div className="mx-auto max-w-6xl py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{todayFormatted}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Farm Overview</h1>
          <p className="mt-2 text-sm text-muted">
            Live summary of cultivation finances, active fertilizer schedules, and alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/transactions')}>
            <Plus size={17} /> Add transaction
          </Button>
          <Button variant="secondary" onClick={() => navigate('/fertilizer')}>
            <Leaf size={16} /> Schedule fertilizer
          </Button>
        </div>
      </div>

      {/* Financial Overview Section */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-text">Financial Performance</h2>
          <p className="mt-0.5 text-xs text-muted">Income and expenses for {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-forest-500"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Total Income */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Total Income</p>
            <div className="grid size-9 place-items-center rounded-lg bg-forest-50 text-forest-600 dark:bg-forest-900/30 dark:text-forest-300">
              <ArrowDownLeft size={19} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-forest-600">
            {formatLKR(summary.totalIncome)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {summary.transactionCount} transactions recorded in {monthLabel}
          </p>
        </Card>

        {/* Total Expenses */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Total Expenses</p>
            <div className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
              <ArrowUpRight size={19} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-amber-600">
            {formatLKR(summary.totalExpenses)}
          </p>
          <p className="mt-1 text-xs text-muted">Cultivation, labor, and materials</p>
        </Card>

        {/* Net Balance */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">Net Balance</p>
            <div className="grid size-9 place-items-center rounded-lg bg-subtle text-text">
              <Activity size={19} />
            </div>
          </div>
          <p
            className={`mt-4 text-2xl font-bold tracking-tight ${
              summary.netBalance >= 0 ? 'text-forest-600' : 'text-red-600'
            }`}
          >
            {formatLKR(summary.netBalance)}
          </p>
          <p className="mt-1 text-xs text-muted">Income minus expenses for selected period</p>
        </Card>
      </div>

      {/* Grid: Reminders and Recent Transactions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Fertilizer Reminders Card */}
        <Card className="p-5 lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-text">Fertilizer Reminders</h2>
                  {activeAlerts.length > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      {activeAlerts.length} Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Evaluated on load for Asia/Colombo timezone
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="View all reminders"
                onClick={() => navigate('/fertilizer')}
              >
                <Leaf size={18} />
              </Button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-muted">Evaluating reminders...</div>
            ) : activeAlerts.length === 0 ? (
              <div className="mt-6 grid justify-items-center rounded-lg border border-dashed border-border px-5 py-8 text-center">
                <div className="grid size-10 place-items-center rounded-full bg-subtle text-muted">
                  <CheckCircle2 size={18} className="text-forest-600" />
                </div>
                <p className="mt-3 text-sm font-medium text-text">All fertilizer applications up to date</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted">
                  No applications are overdue or due in the next 7 days.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {activeAlerts.slice(0, 4).map((rem) => {
                  const isOverdue = rem.status === 'overdue'
                  const isDueToday = rem.status === 'due_today'

                  return (
                    <div
                      key={rem.application.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-xs transition-colors ${
                        isOverdue
                          ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
                          : isDueToday
                          ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
                          : 'border-border bg-surface'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text">
                            {fertMap.get(rem.application.fertilizerId) || 'Fertilizer'}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center gap-0.5 font-bold text-red-700 dark:text-red-400">
                              <AlertTriangle size={11} /> Overdue by {Math.abs(rem.daysRemaining)}d
                            </span>
                          )}
                          {isDueToday && (
                            <span className="inline-flex items-center gap-0.5 font-bold text-amber-700 dark:text-amber-400">
                              <Clock size={11} /> Due Today
                            </span>
                          )}
                          {rem.status === 'due_soon' && (
                            <span className="text-muted">Due in {rem.daysRemaining} days</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted">
                          {landMap.get(rem.application.landId) || 'Land'} ·{' '}
                          {cropMap.get(rem.application.cropId) || 'Crop'} · Due:{' '}
                          {formatDateDisplay(rem.application.nextDueDate || '')}
                        </p>
                      </div>

                      <Button
                        size="default"
                        variant="secondary"
                        className="h-8 px-2.5 text-xs text-forest-700 hover:bg-forest-50 dark:text-forest-200"
                        onClick={() => handleQuickComplete(rem.application.id)}
                      >
                        <CheckCircle2 size={13} /> Complete
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <button
              onClick={() => navigate('/fertilizer')}
              className="flex items-center gap-1.5 text-xs font-semibold text-forest-600 hover:text-forest-700 transition-colors"
            >
              Open Fertilizer Tracker <ArrowRight size={13} />
            </button>
          </div>
        </Card>

        {/* Recent Transactions Card */}
        <Card className="p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-text">Recent Activity</h2>
                <p className="mt-1 text-xs text-muted">Latest financial records</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="View all transactions"
                onClick={() => navigate('/transactions')}
              >
                <ArrowRight size={16} />
              </Button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-muted">Loading activity...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="mt-6 grid justify-items-center rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <div className="grid size-10 place-items-center rounded-full bg-subtle text-muted">
                  <Activity size={18} />
                </div>
                <p className="mt-3 text-sm font-medium text-text">No transactions recorded</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Start logging your cultivation income and expenses.
                </p>
                <div className="mt-4">
                  <Button size="default" className="h-8 text-xs" onClick={() => navigate('/transactions')}>
                    Add transaction
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {recentTransactions.map((tx) => {
                  const isIncome = tx.type === 'income'
                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-text truncate max-w-[170px] sm:max-w-[220px]">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-muted">
                          {formatDateDisplay(tx.date)} · {landMap.get(tx.landId) || 'Land'}
                          {catMap.get(tx.categoryId) ? ` · ${catMap.get(tx.categoryId)}` : ''}
                        </p>
                      </div>
                      <span
                        className={`font-semibold whitespace-nowrap ${
                          isIncome ? 'text-forest-600' : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatLKR(tx.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <button
              onClick={() => navigate('/transactions')}
              className="flex items-center gap-1.5 text-xs font-semibold text-forest-600 hover:text-forest-700 transition-colors"
            >
              View all transactions ({transactions.length}) <ArrowRight size={13} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
