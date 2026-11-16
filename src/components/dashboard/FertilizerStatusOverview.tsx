import { useNavigate } from 'react-router-dom'
import {
  Leaf,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Card } from '../ui/Card.tsx'
import { Button } from '../ui/Button.tsx'
import { formatDateDisplay } from '../../utils/date.ts'
import type { FertilizerStatusOverviewData } from '../../domain/dashboard.ts'

interface FertilizerStatusOverviewProps {
  statusData: FertilizerStatusOverviewData
  onQuickComplete?: (appId: string) => Promise<void>
}

export function FertilizerStatusOverview({
  statusData,
  onQuickComplete,
}: FertilizerStatusOverviewProps) {
  const navigate = useNavigate()

  return (
    <Card className="p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-900/40 dark:text-forest-200">
              <Leaf size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text">Fertilizer Application Status</h3>
                {statusData.overdue > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                    {statusData.overdue} Overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                Nutrient schedule monitoring evaluated on dashboard load (Asia/Colombo)
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="default"
            className="h-8 text-xs gap-1.5"
            onClick={() => navigate('/fertilizer')}
          >
            Manage Tracker <ArrowRight size={13} />
          </Button>
        </div>

        {/* 4 Compact Status Metric Badges */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Overdue */}
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
              {statusData.overdue}
            </p>
            <span className="text-[10px] text-muted">Immediate action</span>
          </div>

          {/* Due Today */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Due Today</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
              {statusData.dueToday}
            </p>
            <span className="text-[10px] text-muted">Schedule for today</span>
          </div>

          {/* Due Soon (7 Days) */}
          <div className="rounded-xl border border-border bg-canvas p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-forest-600 dark:text-forest-400">
              <Calendar size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Due in 7 Days
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-text">{statusData.dueSoon}</p>
            <span className="text-[10px] text-muted">Upcoming window</span>
          </div>

          {/* Completed */}
          <div className="rounded-xl border border-border bg-canvas p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-forest-600 dark:text-forest-400">
              <CheckCircle2 size={14} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Completed
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-forest-600 dark:text-forest-400">
              {statusData.completed}
            </p>
            <span className="text-[10px] text-muted">Historical records</span>
          </div>
        </div>

        {/* Upcoming Applications Table/List */}
        <div className="mt-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2.5">
            Next Scheduled Applications
          </span>

          {statusData.upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted">
              <CheckCircle2 className="mx-auto size-6 text-forest-600 mb-2" />
              <p className="font-medium text-text">No pending fertilizer applications</p>
              <p className="mt-0.5">All scheduled applications are either completed or none are logged.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-canvas overflow-hidden">
              {statusData.upcoming.map((item) => {
                const isOverdue = item.status === 'overdue'
                const isDueToday = item.status === 'due_today'

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs transition-colors hover:bg-subtle/60"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{item.fertilizerName}</span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-300">
                            <AlertTriangle size={10} /> Overdue by {Math.abs(item.daysRemaining)}d
                          </span>
                        )}
                        {isDueToday && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                            <Clock size={10} /> Due Today
                          </span>
                        )}
                        {item.status === 'due_soon' && (
                          <span className="text-[11px] text-muted font-medium">
                            Due in {item.daysRemaining} days
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted">
                        {item.landName} · {item.cropName}
                        {item.quantity ? ` · Dosage: ${item.quantity} ${item.unit || 'kg'}` : ''}
                        {' · Due: '}
                        <strong>{formatDateDisplay(item.nextDueDate)}</strong>
                      </p>
                    </div>

                    {onQuickComplete && (
                      <Button
                        size="default"
                        variant="secondary"
                        className="h-7 text-[11px] px-2.5 text-forest-700 hover:bg-forest-50 dark:text-forest-200"
                        onClick={() => onQuickComplete(item.id)}
                      >
                        <Check size={12} /> Complete
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3 flex items-center justify-between text-xs">
        <span className="text-muted">Need to schedule a new dosage?</span>
        <button
          onClick={() => navigate('/fertilizer')}
          className="flex items-center gap-1 font-semibold text-forest-600 hover:text-forest-700 transition-colors"
        >
          Open Fertilizer Tracker <ArrowRight size={13} />
        </button>
      </div>
    </Card>
  )
}
