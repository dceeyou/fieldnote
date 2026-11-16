import type { Transaction, FertilizerApplication, Land, Crop, Fertilizer, Category } from '../data/db/schema.ts'

export type DatePreset = 'this_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all_time' | 'custom'

export interface DashboardFilters {
  datePreset: DatePreset
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  landId: string    // 'all' or landId
  cropId: string    // 'all' or cropId
}

export interface FinancialKPIs {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  activeAlertsCount: number
  overdueCount: number
  dueTodayCount: number
  dueSoonCount: number
  periodLabel: string
  transactionCount: number
}

export interface MonthlyComparisonPoint {
  monthKey: string       // YYYY-MM
  monthLabel: string     // "Oct 2026"
  income: number
  expenses: number
  netBalance: number
}

export interface TrendPoint {
  date: string           // YYYY-MM or YYYY-MM-DD
  label: string
  income: number
  expenses: number
  cumulativeNet: number
}

export interface CategoryBreakdownItem {
  id: string
  name: string
  amount: number
  percentage: number
  color: string
}

export interface CropPerformanceItem {
  cropId: string
  cropName: string
  income: number
  expenses: number
  netContribution: number
  transactionCount: number
}

export interface LandPerformanceItem {
  landId: string
  landName: string
  income: number
  expenses: number
  netBalance: number
  areaAcres?: number
}

export interface UpcomingFertilizerItem {
  id: string
  landName: string
  cropName: string
  fertilizerName: string
  nextDueDate: string
  quantity?: number
  unit?: string
  status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming'
  daysRemaining: number
}

export interface FertilizerStatusOverviewData {
  overdue: number
  dueToday: number
  dueSoon: number
  completed: number
  upcoming: UpcomingFertilizerItem[]
}

export interface MonthlyCategoryExpensePoint {
  monthKey: string
  monthLabel: string
  [categoryName: string]: string | number
}

export interface DashboardAnalyticsData {
  kpis: FinancialKPIs
  monthlyComparison: MonthlyComparisonPoint[]
  financialTrend: TrendPoint[]
  categoryBreakdown: CategoryBreakdownItem[]
  cropPerformance: CropPerformanceItem[]
  landPerformance: LandPerformanceItem[]
  fertilizerStatus: FertilizerStatusOverviewData
  recentTransactions: Transaction[]
  monthlyCategoryDistribution: MonthlyCategoryExpensePoint[]
  availableCategoryNames: string[]
  hasAnyTransactions: boolean
  rawLands: Land[]
  rawCrops: Crop[]
  rawCategories: Category[]
  rawFertilizers: Fertilizer[]
  rawApplications: FertilizerApplication[]
}
