import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Leaf,
  Filter,
  RefreshCw,
  RotateCcw,
  MapPin,
  Sprout,
} from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'
import { DatePicker } from '../components/ui/date-picker.tsx'
import { GreetingHeader } from '../components/dashboard/GreetingHeader.tsx'
import { WeatherWidget } from '../components/dashboard/WeatherWidget.tsx'
import { FinancialSummaryCards } from '../components/dashboard/FinancialSummaryCard.tsx'
import { IncomeExpenseBarChart } from '../components/dashboard/IncomeExpenseBarChart.tsx'
import { FinancialTrendChart } from '../components/dashboard/FinancialTrendChart.tsx'
import { ExpenseCategoryDonutChart } from '../components/dashboard/ExpenseCategoryDonutChart.tsx'
import { CropPerformanceChart } from '../components/dashboard/CropPerformanceChart.tsx'
import { LandPerformanceChart } from '../components/dashboard/LandPerformanceChart.tsx'
import { FertilizerStatusOverview } from '../components/dashboard/FertilizerStatusOverview.tsx'
import { RecentTransactions } from '../components/dashboard/RecentTransactions.tsx'
import { ExpenseDistributionStackedChart } from '../components/dashboard/ExpenseDistributionStackedChart.tsx'
import { useDashboardFilters } from '../hooks/useDashboardFilters.ts'
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics.ts'
import type { DatePreset } from '../domain/dashboard.ts'

export function Dashboard() {
  const navigate = useNavigate()

  // Dashboard Filters State
  const {
    filters,
    datePreset,
    startDate,
    endDate,
    landId,
    cropId,
    setDatePreset,
    setStartDate,
    setEndDate,
    setLandId,
    setCropId,
    resetFilters,
  } = useDashboardFilters('this_month')

  // Analytics & Data Hook
  const { analytics, loading, error, refresh, quickCompleteFertilizer } =
    useDashboardAnalytics(filters)

  // Filter Bar state
  const isFiltered =
    datePreset !== 'this_month' || landId !== 'all' || cropId !== 'all'

  return (
    <div className="mx-auto max-w-7xl py-6 sm:py-8 space-y-8">
      {/* =========================================================================
          SECTION 0: PERSONALIZED GREETING HEADER WITH LIVE DATE & TIME
         ========================================================================= */}
      <GreetingHeader />

      {/* =========================================================================
          SECTION A: DASHBOARD HEADER & GLOBAL FILTERS
         ========================================================================= */}
      <div className="space-y-6">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text">
              Farm Overview
            </h1>
            <p className="mt-1.5 text-sm text-muted max-w-2xl">
              Live comprehensive dashboard of farm finances, crop margins, field activities, nutrient schedules, and agro-climate conditions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => navigate('/transactions')}
              className="gap-1.5"
            >
              <Plus size={16} /> Add Transaction
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/fertilizer')}
              className="gap-1.5"
            >
              <Leaf size={16} /> Schedule Fertilizer
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              title="Refresh farm data"
              className="size-9"
              aria-label="Refresh data"
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin text-forest-600' : 'text-muted'}
              />
            </Button>
          </div>
        </div>

        {/* Global Filters Control Bar */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <Filter size={14} className="text-forest-600" />
              <span>Dashboard Filters</span>
              {isFiltered && (
                <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-bold text-forest-700 dark:bg-forest-900/30 dark:text-forest-300">
                  Active Filters
                </span>
              )}
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs font-medium text-forest-600 hover:text-forest-700 hover:underline transition-colors"
              >
                <RotateCcw size={12} /> Reset to This Month
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 items-center">
            {/* Date Preset Selector */}
            <div className="lg:col-span-5 space-y-1">
              <label className="block text-[11px] font-medium text-muted">
                Reporting Period
              </label>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { key: 'this_month', label: 'This Month' },
                    { key: 'last_3_months', label: 'Last 3M' },
                    { key: 'last_6_months', label: 'Last 6M' },
                    { key: 'this_year', label: 'This Year' },
                    { key: 'all_time', label: 'All Time' },
                    { key: 'custom', label: 'Custom' },
                  ] as { key: DatePreset; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDatePreset(key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      datePreset === key
                        ? 'bg-forest-600 text-white shadow-sm'
                        : 'border border-border bg-canvas text-text hover:bg-subtle'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dates Inputs (visible when custom preset chosen) */}
            {datePreset === 'custom' && (
              <div className="lg:col-span-3 flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker
                    label="From"
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                  />
                </div>
                <div className="flex-1">
                  <DatePicker
                    label="To"
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    minDate={startDate}
                  />
                </div>
              </div>
            )}

            {/* Land Filter Dropdown */}
            <div
              className={`space-y-1 ${
                datePreset === 'custom' ? 'lg:col-span-2' : 'lg:col-span-3'
              }`}
            >
              <label className="block text-[11px] font-medium text-muted">
                Cultivation Land / Estate
              </label>
              <div className="relative">
                <select
                  value={landId}
                  onChange={(e) => setLandId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-forest-500 appearance-none pr-7"
                >
                  <option value="all">All Lands / Entire Farm</option>
                  {analytics.rawLands.map((land) => (
                    <option key={land.id} value={land.id}>
                      {land.name} {land.areaInAcres ? `(${land.areaInAcres} ac)` : ''}
                    </option>
                  ))}
                </select>
                <MapPin
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-2.5 text-muted"
                />
              </div>
            </div>

            {/* Crop Filter Dropdown */}
            <div
              className={`space-y-1 ${
                datePreset === 'custom' ? 'lg:col-span-2' : 'lg:col-span-4'
              }`}
            >
              <label className="block text-[11px] font-medium text-muted">
                Crop Type
              </label>
              <div className="relative">
                <select
                  value={cropId}
                  onChange={(e) => setCropId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-forest-500 appearance-none pr-7"
                >
                  <option value="all">All Crops (Catalog)</option>
                  {analytics.rawCrops.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name}
                    </option>
                  ))}
                </select>
                <Sprout
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-2.5 text-muted"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <Button size="default" variant="secondary" className="h-7 text-xs" onClick={refresh}>
            Retry
          </Button>
        </div>
      )}

      {/* =========================================================================
          SECTION B: WEATHER WIDGET
         ========================================================================= */}
      <section aria-label="Agricultural Weather Conditions">
        <WeatherWidget
          lands={analytics.rawLands}
          activeLandId={landId !== 'all' ? landId : undefined}
        />
      </section>

      {/* =========================================================================
          SECTION C: FINANCIAL KPI CARDS
         ========================================================================= */}
      <section aria-label="Financial Key Performance Indicators">
        <FinancialSummaryCards kpis={analytics.kpis} />
      </section>

      {/* =========================================================================
          SECTION D: MAIN FINANCIAL ANALYTICS (12-COLUMN DESKTOP GRID)
         ========================================================================= */}
      <section aria-label="Financial Performance Analytics" className="space-y-6">
        {/* Row 1: Monthly Comparison & Cash Trend */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <IncomeExpenseBarChart data={analytics.monthlyComparison} />
          </div>
          <div className="lg:col-span-6">
            <FinancialTrendChart data={analytics.financialTrend} />
          </div>
        </div>

        {/* Row 2: Expense Category Donut & Crop Performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <ExpenseCategoryDonutChart
              data={analytics.categoryBreakdown}
              totalExpenses={analytics.kpis.totalExpenses}
            />
          </div>
          <div className="lg:col-span-6">
            <CropPerformanceChart data={analytics.cropPerformance} />
          </div>
        </div>

        {/* Row 3: Land-wise Performance (Span 12 or 6) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <LandPerformanceChart data={analytics.landPerformance} />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION E: FERTILIZER OVERVIEW
         ========================================================================= */}
      <section aria-label="Fertilizer Application Monitoring">
        <FertilizerStatusOverview
          statusData={analytics.fertilizerStatus}
          onQuickComplete={quickCompleteFertilizer}
        />
      </section>

      {/* =========================================================================
          SECTION F: RECENT TRANSACTIONS
         ========================================================================= */}
      <section aria-label="Recent Financial Activity">
        <RecentTransactions
          transactions={analytics.recentTransactions}
          lands={analytics.rawLands}
          crops={analytics.rawCrops}
          categories={analytics.rawCategories}
        />
      </section>

      {/* =========================================================================
          SECTION G: ADDITIONAL EXPENSE ANALYTICS (COLLAPSIBLE STACKED BAR CHART)
         ========================================================================= */}
      <section aria-label="Monthly Expense Distribution">
        <ExpenseDistributionStackedChart
          data={analytics.monthlyCategoryDistribution}
          categoryNames={analytics.availableCategoryNames}
        />
      </section>
    </div>
  )
}
