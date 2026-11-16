import type {
  Transaction,
  FertilizerApplication,
  Land,
  Crop,
  Category,
  Fertilizer,
} from '../data/db/schema.ts'
import type {
  DashboardFilters,
  DashboardAnalyticsData,
  FinancialKPIs,
  MonthlyComparisonPoint,
  TrendPoint,
  CategoryBreakdownItem,
  CropPerformanceItem,
  LandPerformanceItem,
  FertilizerStatusOverviewData,
  UpcomingFertilizerItem,
  MonthlyCategoryExpensePoint,
} from '../domain/dashboard.ts'
import { getTodayColombo, formatDateDisplay } from '../utils/date.ts'
import { evaluateFertilizerReminders } from '../utils/reminders.ts'

// Vibrant yet professional palette for categories & charts
const CATEGORY_PALETTE = [
  '#2b5134', // forest-700
  '#ea580c', // orange-600
  '#0284c7', // sky-600
  '#d97706', // amber-600
  '#16a34a', // green-600
  '#7c3aed', // violet-600
  '#0d9488', // teal-600
  '#e11d48', // rose-600
  '#4f46e5', // indigo-600
  '#ca8a04', // yellow-600
  '#475569', // slate-600
]

export function computeDashboardAnalytics(
  transactions: Transaction[],
  applications: FertilizerApplication[],
  lands: Land[],
  crops: Crop[],
  categories: Category[],
  fertilizers: Fertilizer[],
  filters: DashboardFilters
): DashboardAnalyticsData {
  const today = getTodayColombo()

  // Build lookup maps
  const landMap = new Map(lands.map((l) => [l.id, l]))
  const cropMap = new Map(crops.map((c) => [c.id, c]))
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const fertMap = new Map(fertilizers.map((f) => [f.id, f]))

  // 1. Filter Transactions by Date, Land, Crop
  const filteredTx = transactions.filter((tx) => {
    // Date filter
    if (filters.startDate && tx.date < filters.startDate) return false
    if (filters.endDate && tx.date > filters.endDate) return false

    // Land filter
    if (filters.landId !== 'all' && tx.landId !== filters.landId) return false

    // Crop filter
    if (filters.cropId !== 'all' && tx.cropId !== filters.cropId) return false

    return true
  })

  // 2. Compute Financial KPIs
  let totalIncome = 0
  let totalExpenses = 0

  for (const tx of filteredTx) {
    const amt = Number(tx.amount) || 0
    if (tx.type === 'income') {
      totalIncome += amt
    } else if (tx.type === 'expense') {
      totalExpenses += amt
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100
  totalExpenses = Math.round(totalExpenses * 100) / 100
  const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100

  // 3. Fertilizer Status & Reminders
  // Reminders evaluated on load for Asia/Colombo timezone
  // Filter applications by land & crop if filters applied
  const relevantApps = applications.filter((app) => {
    if (filters.landId !== 'all' && app.landId !== filters.landId) return false
    if (filters.cropId !== 'all' && app.cropId !== filters.cropId) return false
    return true
  })

  const activeScheduledApps = relevantApps.filter((app) => app.status === 'scheduled')
  const completedCount = relevantApps.filter((app) => app.status === 'completed').length

  const reminders = evaluateFertilizerReminders(activeScheduledApps, today)
  const overdueReminders = reminders.filter((r) => r.status === 'overdue')
  const dueTodayReminders = reminders.filter((r) => r.status === 'due_today')
  const dueSoonReminders = reminders.filter((r) => r.status === 'due_soon')
  const activeAlertsCount = overdueReminders.length + dueTodayReminders.length + dueSoonReminders.length

  // Build upcoming list sorted by due date
  const upcomingList: UpcomingFertilizerItem[] = activeScheduledApps
    .filter((app) => app.nextDueDate)
    .sort((a, b) => (a.nextDueDate || '').localeCompare(b.nextDueDate || ''))
    .map((app) => {
      const dueDate = app.nextDueDate || ''
      let status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming' = 'upcoming'
      const diffDays = Math.round(
        (new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (dueDate < today) status = 'overdue'
      else if (dueDate === today) status = 'due_today'
      else if (diffDays <= 7) status = 'due_soon'

      return {
        id: app.id,
        landName: landMap.get(app.landId)?.name || 'Land',
        cropName: cropMap.get(app.cropId)?.name || 'Crop',
        fertilizerName: fertMap.get(app.fertilizerId)?.name || 'Fertilizer',
        nextDueDate: dueDate,
        quantity: app.quantity,
        unit: app.unit,
        status,
        daysRemaining: diffDays,
      }
    })

  const fertilizerStatus: FertilizerStatusOverviewData = {
    overdue: overdueReminders.length,
    dueToday: dueTodayReminders.length,
    dueSoon: dueSoonReminders.length,
    completed: completedCount,
    upcoming: upcomingList.slice(0, 6),
  }

  // Derive Period Label for display
  let periodLabel = 'Custom Period'
  if (filters.datePreset === 'this_month') {
    periodLabel = 'This Month'
  } else if (filters.datePreset === 'last_3_months') {
    periodLabel = 'Last 3 Months'
  } else if (filters.datePreset === 'last_6_months') {
    periodLabel = 'Last 6 Months'
  } else if (filters.datePreset === 'this_year') {
    periodLabel = 'This Year'
  } else if (filters.datePreset === 'all_time') {
    periodLabel = 'All Time'
  } else if (filters.startDate && filters.endDate) {
    periodLabel = `${formatDateDisplay(filters.startDate)} - ${formatDateDisplay(filters.endDate)}`
  }

  const kpis: FinancialKPIs = {
    totalIncome,
    totalExpenses,
    netBalance,
    activeAlertsCount,
    overdueCount: overdueReminders.length,
    dueTodayCount: dueTodayReminders.length,
    dueSoonCount: dueSoonReminders.length,
    periodLabel,
    transactionCount: filteredTx.length,
  }

  // 4. Monthly Comparison & Trend (Grouped Bar Chart & Two-series Line Chart)
  const monthlyMap = new Map<string, { income: number; expenses: number }>()

  // Determine months range
  for (const tx of filteredTx) {
    const monthKey = tx.date.slice(0, 7) // YYYY-MM
    const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 }
    if (tx.type === 'income') {
      current.income += Number(tx.amount) || 0
    } else if (tx.type === 'expense') {
      current.expenses += Number(tx.amount) || 0
    }
    monthlyMap.set(monthKey, current)
  }

  // If no transactions in range, ensure at least current month is represented
  if (monthlyMap.size === 0) {
    const currentMonthKey = today.slice(0, 7)
    monthlyMap.set(currentMonthKey, { income: 0, expenses: 0 })
  }

  // Sort months chronologically
  const sortedMonthKeys = Array.from(monthlyMap.keys()).sort()

  const monthlyComparison: MonthlyComparisonPoint[] = sortedMonthKeys.map((monthKey) => {
    const data = monthlyMap.get(monthKey)!
    const [year, month] = monthKey.split('-').map(Number)
    const d = new Date(Date.UTC(year, month - 1, 1))
    const monthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d)

    const income = Math.round(data.income * 100) / 100
    const expenses = Math.round(data.expenses * 100) / 100
    return {
      monthKey,
      monthLabel,
      income,
      expenses,
      netBalance: Math.round((income - expenses) * 100) / 100,
    }
  })

  // Trend data points with cumulative net
  let runningCumulative = 0
  const financialTrend: TrendPoint[] = monthlyComparison.map((m) => {
    runningCumulative += m.netBalance
    return {
      date: m.monthKey,
      label: m.monthLabel,
      income: m.income,
      expenses: m.expenses,
      cumulativeNet: Math.round(runningCumulative * 100) / 100,
    }
  })

  // 5. Expense Category Breakdown (Donut Chart)
  const categoryExpenseMap = new Map<string, number>()
  for (const tx of filteredTx) {
    if (tx.type === 'expense') {
      const amt = Number(tx.amount) || 0
      categoryExpenseMap.set(tx.categoryId, (categoryExpenseMap.get(tx.categoryId) || 0) + amt)
    }
  }

  const categoryBreakdown: CategoryBreakdownItem[] = []
  let colorIdx = 0

  // Sort descending by amount
  const sortedCatEntries = Array.from(categoryExpenseMap.entries()).sort((a, b) => b[1] - a[1])

  for (const [catId, amount] of sortedCatEntries) {
    const cat = catMap.get(catId)
    const name = cat?.name || 'Uncategorized'
    const roundedAmt = Math.round(amount * 100) / 100
    const percentage = totalExpenses > 0 ? Math.round((roundedAmt / totalExpenses) * 1000) / 10 : 0
    categoryBreakdown.push({
      id: catId,
      name,
      amount: roundedAmt,
      percentage,
      color: CATEGORY_PALETTE[colorIdx % CATEGORY_PALETTE.length],
    })
    colorIdx++
  }

  // 6. Crop-wise Performance (Horizontal Grouped Bar Chart)
  // Exclude transactions without crop assignment from crop-specific comparisons.
  const cropStatsMap = new Map<
    string,
    { income: number; expenses: number; count: number }
  >()

  for (const tx of filteredTx) {
    if (tx.cropId) {
      const stats = cropStatsMap.get(tx.cropId) || { income: 0, expenses: 0, count: 0 }
      const amt = Number(tx.amount) || 0
      if (tx.type === 'income') stats.income += amt
      else if (tx.type === 'expense') stats.expenses += amt
      stats.count++
      cropStatsMap.set(tx.cropId, stats)
    }
  }

  // Fetch crops dynamically
  const cropPerformance: CropPerformanceItem[] = []
  for (const [cId, stats] of cropStatsMap.entries()) {
    const crop = cropMap.get(cId)
    const cropName = crop?.name || 'Unknown Crop'
    const inc = Math.round(stats.income * 100) / 100
    const exp = Math.round(stats.expenses * 100) / 100
    cropPerformance.push({
      cropId: cId,
      cropName,
      income: inc,
      expenses: exp,
      netContribution: Math.round((inc - exp) * 100) / 100,
      transactionCount: stats.count,
    })
  }

  // Sort by net contribution descending, or total activity
  cropPerformance.sort((a, b) => b.income + b.expenses - (a.income + a.expenses))

  // 7. Land-wise Performance (Horizontal Bar Chart)
  // Every transaction must have a valid land. General land-level expenses without crop are included.
  const landStatsMap = new Map<string, { income: number; expenses: number }>()

  for (const tx of filteredTx) {
    if (tx.landId) {
      const stats = landStatsMap.get(tx.landId) || { income: 0, expenses: 0 }
      const amt = Number(tx.amount) || 0
      if (tx.type === 'income') stats.income += amt
      else if (tx.type === 'expense') stats.expenses += amt
      landStatsMap.set(tx.landId, stats)
    }
  }

  // Also include lands that exist in the system if within 'all' lands filter
  if (filters.landId === 'all') {
    for (const land of lands) {
      if (!landStatsMap.has(land.id)) {
        landStatsMap.set(land.id, { income: 0, expenses: 0 })
      }
    }
  }

  const landPerformance: LandPerformanceItem[] = []
  for (const [lId, stats] of landStatsMap.entries()) {
    const land = landMap.get(lId)
    const landName = land?.name || 'Estate'
    const inc = Math.round(stats.income * 100) / 100
    const exp = Math.round(stats.expenses * 100) / 100
    landPerformance.push({
      landId: lId,
      landName,
      income: inc,
      expenses: exp,
      netBalance: Math.round((inc - exp) * 100) / 100,
      areaAcres: land?.areaInAcres,
    })
  }

  landPerformance.sort((a, b) => b.income + b.expenses - (a.income + a.expenses))

  // 8. Recent Transactions (Latest 5-8 matching current filters)
  const sortedTx = [...filteredTx].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
  const recentTransactions = sortedTx.slice(0, 8)

  // 9. Section G: Monthly Category Expense Distribution (Stacked Bar Chart)
  const monthlyCategoryMap = new Map<string, Map<string, number>>()
  const allCategoryNames = new Set<string>()

  for (const tx of filteredTx) {
    if (tx.type === 'expense') {
      const monthKey = tx.date.slice(0, 7)
      const catName = catMap.get(tx.categoryId)?.name || 'Other Expense'
      allCategoryNames.add(catName)

      if (!monthlyCategoryMap.has(monthKey)) {
        monthlyCategoryMap.set(monthKey, new Map())
      }
      const m = monthlyCategoryMap.get(monthKey)!
      m.set(catName, (m.get(catName) || 0) + (Number(tx.amount) || 0))
    }
  }

  const monthlyCategoryDistribution: MonthlyCategoryExpensePoint[] = sortedMonthKeys.map(
    (monthKey) => {
      const [year, month] = monthKey.split('-').map(Number)
      const d = new Date(Date.UTC(year, month - 1, 1))
      const monthLabel = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d)

      const point: MonthlyCategoryExpensePoint = {
        monthKey,
        monthLabel,
      }

      const catMapForMonth = monthlyCategoryMap.get(monthKey)
      for (const catName of allCategoryNames) {
        const val = catMapForMonth?.get(catName) || 0
        point[catName] = Math.round(val * 100) / 100
      }

      return point
    }
  )

  return {
    kpis,
    monthlyComparison,
    financialTrend,
    categoryBreakdown,
    cropPerformance,
    landPerformance,
    fertilizerStatus,
    recentTransactions,
    monthlyCategoryDistribution,
    availableCategoryNames: Array.from(allCategoryNames),
    hasAnyTransactions: transactions.length > 0,
    rawLands: lands,
    rawCrops: crops,
    rawCategories: categories,
    rawFertilizers: fertilizers,
    rawApplications: applications,
  }
}
