import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { paginateItems } from '../src/utils/pagination.ts'
import { selectTransactionIndexStrategy } from '../src/services/transactionService.ts'
import { validateBackup } from '../src/services/backupService.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

describe('Wave 3: Transaction Table Pagination (STB-07)', () => {
  it('handles an empty dataset cleanly without division-by-zero or invalid bounds', () => {
    const result = paginateItems([], 1, 25)
    assert.deepEqual(result.items, [])
    assert.equal(result.page, 1)
    assert.equal(result.totalPages, 1)
    assert.equal(result.totalItems, 0)
    assert.equal(result.startIndex, 0)
    assert.equal(result.endIndex, 0)
    assert.equal(result.hasPrevious, false)
    assert.equal(result.hasNext, false)
  })

  it('slices items accurately across multiple pages and computes 1-based display bounds', () => {
    const data = Array.from({ length: 62 }, (_, idx) => ({ id: `tx-${idx + 1}` }))

    const page1 = paginateItems(data, 1, 25)
    assert.equal(page1.items.length, 25)
    assert.equal(page1.items[0].id, 'tx-1')
    assert.equal(page1.items[24].id, 'tx-25')
    assert.equal(page1.totalPages, 3)
    assert.equal(page1.startIndex, 1)
    assert.equal(page1.endIndex, 25)
    assert.equal(page1.hasPrevious, false)
    assert.equal(page1.hasNext, true)

    const page2 = paginateItems(data, 2, 25)
    assert.equal(page2.items.length, 25)
    assert.equal(page2.items[0].id, 'tx-26')
    assert.equal(page2.startIndex, 26)
    assert.equal(page2.endIndex, 50)
    assert.equal(page2.hasPrevious, true)
    assert.equal(page2.hasNext, true)

    const page3 = paginateItems(data, 3, 25)
    assert.equal(page3.items.length, 12)
    assert.equal(page3.items[0].id, 'tx-51')
    assert.equal(page3.items[11].id, 'tx-62')
    assert.equal(page3.startIndex, 51)
    assert.equal(page3.endIndex, 62)
    assert.equal(page3.hasPrevious, true)
    assert.equal(page3.hasNext, false)
  })

  it('clamps out-of-range page numbers and sanitizes invalid page sizes', () => {
    const data = Array.from({ length: 30 }, (_, idx) => idx + 1)

    const tooHigh = paginateItems(data, 99, 10)
    assert.equal(tooHigh.page, 3)
    assert.equal(tooHigh.startIndex, 21)
    assert.equal(tooHigh.endIndex, 30)

    const tooLow = paginateItems(data, -5, 10)
    assert.equal(tooLow.page, 1)
    assert.equal(tooLow.startIndex, 1)

    const zeroPageSize = paginateItems(data, 1, 0)
    assert.equal(zeroPageSize.pageSize, 25)
    assert.equal(zeroPageSize.totalPages, 2)

    const negativePageSize = paginateItems(data, 1, -10)
    assert.equal(negativePageSize.pageSize, 1)
    assert.equal(negativePageSize.totalPages, 30)
  })
})

describe('Wave 3: Indexed Dexie Transaction Query Strategy (STB-07)', () => {
  it('selects [landId+date] compound index when landId and date bounds are provided', () => {
    assert.equal(
      selectTransactionIndexStrategy({
        landId: 'land-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
      'compound_land_date'
    )
  })

  it('selects [type+date] compound index when type and date bounds are provided without landId', () => {
    assert.equal(
      selectTransactionIndexStrategy({
        type: 'expense',
        startDate: '2026-11-01',
      }),
      'compound_type_date'
    )
  })

  it('selects single-column date, landId, categoryId, and type indexes appropriately', () => {
    assert.equal(selectTransactionIndexStrategy({ startDate: '2026-01-01' }), 'index_date')
    assert.equal(selectTransactionIndexStrategy({ landId: 'land-1' }), 'index_land')
    assert.equal(selectTransactionIndexStrategy({ categoryId: 'cat-1' }), 'index_category')
    assert.equal(selectTransactionIndexStrategy({ type: 'income' }), 'index_type')
  })

  it('falls back to full_scan only when no indexed filters are active', () => {
    assert.equal(selectTransactionIndexStrategy(undefined), 'full_scan')
    assert.equal(
      selectTransactionIndexStrategy({ type: 'all', landId: 'all', categoryId: 'all' }),
      'full_scan'
    )
  })
})

describe('Wave 3: Code-Splitting, Lazy Charts & Backup Compatibility Guards (STB-07)', () => {
  it('App.tsx lazy-loads all 8 page routes inside React Suspense', () => {
    const appSrc = fs.readFileSync(path.join(rootDir, 'src/app/App.tsx'), 'utf8')
    assert.match(appSrc, /Suspense/)
    for (const page of [
      'Login.tsx',
      'ResetPassword.tsx',
      'Dashboard.tsx',
      'Transactions.tsx',
      'FertilizerTracker.tsx',
      'CultivationAreas.tsx',
      'Reports.tsx',
      'Settings.tsx',
    ]) {
      assert.match(appSrc, new RegExp(`import\\(['"]\\.\\.\\/pages\\/${page.replace('.', '\\.')}['"]\\)`))
    }
  })

  it('Dashboard.tsx lazy-loads all 6 Recharts chart components inside Suspense', () => {
    const dashSrc = fs.readFileSync(path.join(rootDir, 'src/pages/Dashboard.tsx'), 'utf8')
    assert.match(dashSrc, /<Suspense\b/)
    for (const chart of [
      'IncomeExpenseBarChart.tsx',
      'FinancialTrendChart.tsx',
      'ExpenseCategoryDonutChart.tsx',
      'CropPerformanceChart.tsx',
      'LandPerformanceChart.tsx',
      'ExpenseDistributionStackedChart.tsx',
    ]) {
      assert.match(dashSrc, new RegExp(`lazy\\([\\s\\S]*?${chart.replace('.', '\\.')}`))
    }
  })

  it('vite.config.ts defines Rollup manualChunks and keeps exceljs out of eager SW precaching', () => {
    const viteSrc = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf8')
    assert.match(viteSrc, /manualChunks\(id\)/)
    assert.match(viteSrc, /vendor-react/)
    assert.match(viteSrc, /vendor-charts/)
    assert.match(viteSrc, /vendor-supabase/)
    assert.match(viteSrc, /!fileName\.includes\('exceljs'\)/)
  })

  it('validateBackup accepts both AgriFlow and legacy Fieldnote backup files and rejects malformed data', () => {
    const baseData = {
      lands: [],
      crops: [],
      landCrops: [],
      categories: [],
      transactions: [],
      fertilizers: [],
      fertilizerApplications: [],
      settings: [],
    }

    const agriRes = validateBackup({
      version: 1,
      appName: 'AgriFlow - Agriculture Management',
      exportedAt: '2026-11-18T00:00:00.000Z',
      data: baseData,
    })
    assert.equal(agriRes.valid, true)

    const legacyRes = validateBackup({
      version: 1,
      appName: 'Fieldnote - Agriculture Management',
      exportedAt: '2026-11-01T00:00:00.000Z',
      data: baseData,
    })
    assert.equal(legacyRes.valid, true)

    const invalidVersionRes = validateBackup({ version: 99, appName: 'AgriFlow', data: baseData })
    assert.equal(invalidVersionRes.valid, false)

    const missingTableRes = validateBackup({
      version: 1,
      appName: 'AgriFlow - Agriculture Management',
      data: { lands: [] },
    })
    assert.equal(missingTableRes.valid, false)
  })
})
