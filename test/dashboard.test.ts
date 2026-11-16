import { describe, it } from 'node:test'
import assert from 'node:assert'
import { interpretWeatherCode } from '../src/services/weatherService.ts'
import { computeDashboardAnalytics } from '../src/services/dashboardService.ts'
import { computeDatesForPreset } from '../src/hooks/useDashboardFilters.ts'
import type {
  Transaction,
  FertilizerApplication,
  Land,
  Crop,
  Category,
  Fertilizer,
} from '../src/data/db/schema.ts'
import type { DashboardFilters } from '../src/domain/dashboard.ts'

describe('Weather Service & WMO Interpreter', () => {
  it('correctly maps clear sky code (0)', () => {
    const res = interpretWeatherCode(0)
    assert.strictEqual(res.condition, 'Clear Sky')
    assert.strictEqual(res.iconName, 'Sun')
  })

  it('correctly maps rain codes (61, 63, 65)', () => {
    assert.strictEqual(interpretWeatherCode(61).condition, 'Slight Rain')
    assert.strictEqual(interpretWeatherCode(63).condition, 'Moderate Rain')
    assert.strictEqual(interpretWeatherCode(65).condition, 'Heavy Rain')
    assert.strictEqual(interpretWeatherCode(61).iconName, 'CloudRain')
  })

  it('correctly maps thunderstorm (95)', () => {
    const res = interpretWeatherCode(95)
    assert.strictEqual(res.condition, 'Thunderstorm')
    assert.strictEqual(res.iconName, 'CloudLightning')
  })

  it('falls back safely for unknown weather code', () => {
    const res = interpretWeatherCode(999)
    assert.strictEqual(res.condition, 'Fair Weather')
    assert.strictEqual(res.iconName, 'Sun')
  })
})

describe('Dashboard Filter Presets', () => {
  it('computes this_month starting on first day of month', () => {
    const { startDate, endDate } = computeDatesForPreset('this_month')
    assert.match(startDate, /^\d{4}-\d{2}-01$/)
    assert.match(endDate, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(startDate <= endDate)
  })

  it('computes this_year starting on Jan 1', () => {
    const { startDate, endDate } = computeDatesForPreset('this_year')
    assert.match(startDate, /^\d{4}-01-01$/)
    assert.match(endDate, /^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns empty bounds for all_time', () => {
    const { startDate, endDate } = computeDatesForPreset('all_time')
    assert.strictEqual(startDate, '')
    assert.strictEqual(endDate, '')
  })
})

describe('Dashboard Analytics Business Rules', () => {
  const dummyLands: Land[] = [
    {
      id: 'land-1',
      name: 'North Plot',
      location: 'Kandy',
      areaValue: 5,
      areaUnit: 'acre',
      areaInAcres: 5,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'land-2',
      name: 'South Valley',
      location: 'Matale',
      areaValue: 10,
      areaUnit: 'acre',
      areaInAcres: 10,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ]

  const dummyCrops: Crop[] = [
    {
      id: 'crop-1',
      name: 'Ginger',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'crop-2',
      name: 'Tea',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ]

  const dummyCategories: Category[] = [
    {
      id: 'cat-inc',
      name: 'Harvest Sales',
      type: 'income',
      isActive: true,
      sortOrder: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'cat-fert',
      name: 'Fertilizer & Nutrients',
      type: 'expense',
      isActive: true,
      sortOrder: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'cat-lab',
      name: 'Labor & Wages',
      type: 'expense',
      isActive: true,
      sortOrder: 3,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ]

  const dummyFertilizers: Fertilizer[] = [
    {
      id: 'fert-1',
      name: 'Urea 46%',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ]

  const dummyTransactions: Transaction[] = [
    // Income on land-1 with crop-1
    {
      id: 'tx-1',
      date: '2026-11-05',
      type: 'income',
      landId: 'land-1',
      cropId: 'crop-1',
      categoryId: 'cat-inc',
      description: 'Ginger harvest sale',
      amount: 150000,
      source: 'manual',
      createdAt: '2026-11-05T10:00:00Z',
      updatedAt: '2026-11-05T10:00:00Z',
    },
    // Expense on land-1 with crop-1
    {
      id: 'tx-2',
      date: '2026-11-08',
      type: 'expense',
      landId: 'land-1',
      cropId: 'crop-1',
      categoryId: 'cat-fert',
      description: 'Ginger fertilizer bags',
      amount: 30000,
      source: 'manual',
      createdAt: '2026-11-08T10:00:00Z',
      updatedAt: '2026-11-08T10:00:00Z',
    },
    // General land expense without crop assignment
    {
      id: 'tx-3',
      date: '2026-11-10',
      type: 'expense',
      landId: 'land-1',
      categoryId: 'cat-lab',
      description: 'Perimeter fencing repair',
      amount: 20000,
      source: 'manual',
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
    },
  ]

  const dummyApplications: FertilizerApplication[] = [
    {
      id: 'app-1',
      landId: 'land-1',
      cropId: 'crop-1',
      fertilizerId: 'fert-1',
      applicationDate: '2026-10-01',
      nextDueDate: '2026-11-01', // overdue relative to Nov 16
      status: 'scheduled',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'app-2',
      landId: 'land-1',
      cropId: 'crop-1',
      fertilizerId: 'fert-1',
      applicationDate: '2026-10-15',
      nextDueDate: '2026-11-01',
      status: 'completed', // completed should be ignored in reminders
      actualCompletedDate: '2026-11-01',
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
  ]

  const filters: DashboardFilters = {
    datePreset: 'all_time',
    startDate: '',
    endDate: '',
    landId: 'all',
    cropId: 'all',
  }

  it('correctly calculates total income, expenses, and net balance', () => {
    const analytics = computeDashboardAnalytics(
      dummyTransactions,
      dummyApplications,
      dummyLands,
      dummyCrops,
      dummyCategories,
      dummyFertilizers,
      filters
    )

    assert.strictEqual(analytics.kpis.totalIncome, 150000)
    assert.strictEqual(analytics.kpis.totalExpenses, 50000) // 30k + 20k
    assert.strictEqual(analytics.kpis.netBalance, 100000)
    assert.strictEqual(analytics.kpis.transactionCount, 3)
  })

  it('excludes crop-less transactions from crop analytics but retains them in land analytics', () => {
    const analytics = computeDashboardAnalytics(
      dummyTransactions,
      dummyApplications,
      dummyLands,
      dummyCrops,
      dummyCategories,
      dummyFertilizers,
      filters
    )

    // Crop performance should ONLY include crop-1 (Ginger)
    assert.strictEqual(analytics.cropPerformance.length, 1)
    const gingerStats = analytics.cropPerformance[0]
    assert.strictEqual(gingerStats.cropName, 'Ginger')
    assert.strictEqual(gingerStats.income, 150000)
    assert.strictEqual(gingerStats.expenses, 30000) // tx-3 (20000) excluded because no crop
    assert.strictEqual(gingerStats.netContribution, 120000)

    // Land performance for land-1 MUST include all 50k expenses (including perimeter fence)
    const land1Stats = analytics.landPerformance.find((l) => l.landId === 'land-1')
    assert.ok(land1Stats)
    assert.strictEqual(land1Stats.income, 150000)
    assert.strictEqual(land1Stats.expenses, 50000)
    assert.strictEqual(land1Stats.netBalance, 100000)
  })

  it('evaluates fertilizer reminders correctly and excludes completed items', () => {
    const analytics = computeDashboardAnalytics(
      dummyTransactions,
      dummyApplications,
      dummyLands,
      dummyCrops,
      dummyCategories,
      dummyFertilizers,
      filters
    )

    assert.strictEqual(analytics.fertilizerStatus.overdue, 1) // app-1
    assert.strictEqual(analytics.fertilizerStatus.completed, 1) // app-2
    assert.strictEqual(analytics.kpis.activeAlertsCount, 1)
  })

  it('correctly calculates category breakdown percentages', () => {
    const analytics = computeDashboardAnalytics(
      dummyTransactions,
      dummyApplications,
      dummyLands,
      dummyCrops,
      dummyCategories,
      dummyFertilizers,
      filters
    )

    // Total expenses = 50,000
    // Fertilizer = 30,000 (60%)
    // Labor = 20,000 (40%)
    assert.strictEqual(analytics.categoryBreakdown.length, 2)
    const fertCat = analytics.categoryBreakdown.find((c) => c.name === 'Fertilizer & Nutrients')
    const labCat = analytics.categoryBreakdown.find((c) => c.name === 'Labor & Wages')

    assert.ok(fertCat)
    assert.ok(labCat)
    assert.strictEqual(fertCat.percentage, 60)
    assert.strictEqual(labCat.percentage, 40)
  })
})
