import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { Card } from '../ui/Card.tsx'
import { formatLKR } from '../../utils/calculations.ts'
import type { FinancialKPIs } from '../../domain/dashboard.ts'

interface FinancialSummaryCardsProps {
  kpis: FinancialKPIs
}

export function FinancialSummaryCards({ kpis }: FinancialSummaryCardsProps) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* 1. Total Income */}
      <Card
        onClick={() => navigate('/transactions?type=income')}
        className="group relative cursor-pointer p-3.5 sm:p-5 transition-all hover:border-forest-600/50 hover:shadow-sm"
        role="button"
        tabIndex={0}
        aria-label={`Total Income ${formatLKR(kpis.totalIncome)}. Click to view income transactions.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/transactions?type=income')
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted truncate">
            Total Income
          </p>
          <div className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-900/30 dark:text-forest-200 transition-transform group-hover:scale-105">
            <ArrowDownLeft size={16} />
          </div>
        </div>
        <p className="mt-2.5 sm:mt-3 text-base sm:text-2xl font-bold tracking-tight text-forest-600 dark:text-forest-400 break-words">
          {formatLKR(kpis.totalIncome)}
        </p>
        <div className="mt-2 flex items-center justify-between gap-1 text-[11px] sm:text-xs text-muted">
          <span className="truncate">{kpis.periodLabel}</span>
          <span className="flex items-center gap-0.5 shrink-0 text-forest-600 group-hover:underline">
            View <ChevronRight size={12} />
          </span>
        </div>
      </Card>

      {/* 2. Total Expenses */}
      <Card
        onClick={() => navigate('/transactions?type=expense')}
        className="group relative cursor-pointer p-3.5 sm:p-5 transition-all hover:border-orange-500/50 hover:shadow-sm"
        role="button"
        tabIndex={0}
        aria-label={`Total Expenses ${formatLKR(kpis.totalExpenses)}. Click to view expense transactions.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/transactions?type=expense')
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted truncate">
            Total Expenses
          </p>
          <div className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300 transition-transform group-hover:scale-105">
            <ArrowUpRight size={16} />
          </div>
        </div>
        <p className="mt-2.5 sm:mt-3 text-base sm:text-2xl font-bold tracking-tight text-orange-600 dark:text-orange-400 break-words">
          {formatLKR(kpis.totalExpenses)}
        </p>
        <div className="mt-2 flex items-center justify-between gap-1 text-[11px] sm:text-xs text-muted">
          <span className="truncate">{kpis.periodLabel}</span>
          <span className="flex items-center gap-0.5 shrink-0 text-orange-600 group-hover:underline">
            View <ChevronRight size={12} />
          </span>
        </div>
      </Card>

      {/* 3. Net Balance */}
      <Card
        onClick={() => navigate('/transactions')}
        className="group relative cursor-pointer p-3.5 sm:p-5 transition-all hover:border-forest-600/50 hover:shadow-sm"
        role="button"
        tabIndex={0}
        aria-label={`Net Balance ${formatLKR(kpis.netBalance)}. Click to view all transactions.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/transactions')
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted truncate">
            Net Balance
          </p>
          <div className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg bg-subtle text-text transition-transform group-hover:scale-105">
            <Activity size={16} />
          </div>
        </div>
        <p
          className={`mt-2.5 sm:mt-3 text-base sm:text-2xl font-bold tracking-tight break-words ${
            kpis.netBalance >= 0
              ? 'text-forest-600 dark:text-forest-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatLKR(kpis.netBalance)}
        </p>
        <div className="mt-2 flex items-center justify-between gap-1 text-[11px] sm:text-xs text-muted">
          <span className="truncate">{kpis.periodLabel}</span>
          <span className="flex items-center gap-0.5 shrink-0 text-text group-hover:underline">
            All <ChevronRight size={12} />
          </span>
        </div>
      </Card>

      {/* 4. Fertilizer Alerts */}
      <Card
        onClick={() => navigate('/fertilizer')}
        className={`group relative cursor-pointer p-3.5 sm:p-5 transition-all hover:shadow-sm ${
          kpis.overdueCount > 0
            ? 'border-red-300 dark:border-red-900/60 hover:border-red-500'
            : kpis.dueTodayCount > 0 || kpis.dueSoonCount > 0
            ? 'border-amber-300 dark:border-amber-900/60 hover:border-amber-500'
            : 'border-border hover:border-forest-600/50'
        }`}
        role="button"
        tabIndex={0}
        aria-label={`Fertilizer Alerts: ${kpis.activeAlertsCount} active. Click to view schedules.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/fertilizer')
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted truncate">
            Fertilizer Alerts
          </p>
          <div
            className={`grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105 ${
              kpis.overdueCount > 0
                ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300'
                : kpis.dueTodayCount > 0 || kpis.dueSoonCount > 0
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
                : 'bg-forest-50 text-forest-600 dark:bg-forest-900/30 dark:text-forest-300'
            }`}
          >
            {kpis.overdueCount > 0 ? (
              <AlertTriangle size={16} />
            ) : kpis.dueTodayCount > 0 || kpis.dueSoonCount > 0 ? (
              <Clock size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
          </div>
        </div>

        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
          <span
            className={`text-base sm:text-2xl font-bold tracking-tight ${
              kpis.overdueCount > 0
                ? 'text-red-600 dark:text-red-400'
                : kpis.dueTodayCount > 0 || kpis.dueSoonCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-forest-600 dark:text-forest-400'
            }`}
          >
            {kpis.activeAlertsCount}
          </span>
          <span className="text-[11px] sm:text-xs text-muted truncate">
            {kpis.activeAlertsCount === 1 ? 'Action' : 'Actions'}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-1 text-[11px] sm:text-xs text-muted">
          <span className="truncate">
            {kpis.overdueCount > 0
              ? `${kpis.overdueCount} Overdue`
              : kpis.dueTodayCount > 0
              ? `${kpis.dueTodayCount} Today`
              : kpis.dueSoonCount > 0
              ? `${kpis.dueSoonCount} Soon`
              : 'Up to Date'}
          </span>
          <span className="flex items-center gap-0.5 shrink-0 text-forest-600 group-hover:underline">
            View <ChevronRight size={12} />
          </span>
        </div>
      </Card>
    </div>
  )
}
