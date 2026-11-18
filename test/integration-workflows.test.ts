import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import {
  transactionInputSchema,
  fertilizerApplicationInputSchema,
} from '../src/domain/validation.ts'
import { calculateFinancialSummary, formatLKR } from '../src/utils/calculations.ts'
import { calculateDueDateFromInterval, getReminderIntervalLabel } from '../src/utils/date.ts'
import { getFertilizerDueStatus, evaluateFertilizerReminders } from '../src/utils/reminders.ts'
import { buildExcelWorkbook, type ExportPayload } from '../src/services/exportService.ts'
import {
  reconcileRecords,
  DELETE_SYNC_ORDER,
} from '../src/services/syncService.ts'
import {
  ALL_DEFAULT_CATEGORIES,
  parseCategoryCsv,
  validateCategoryRows,
  auditCategoryDuplicates,
  suggestCategory,
} from '../src/domain/category.ts'
import { paginateItems } from '../src/utils/pagination.ts'
import type { Transaction, FertilizerApplication, Category } from '../src/data/db/schema.ts'

describe('Integration Workflow: Transaction Management, Pagination & ExcelJS Export', () => {
  it('validates transactions, calculates summary totals, paginates rows, and generates a readable .xlsx binary', async () => {
    const rawInputs = [
      {
        date: '2026-11-02',
        type: 'income' as const,
        landId: 'land-1',
        cropId: 'crop-1',
        categoryId: 'cat-inc-1',
        description: 'Ginger harvest sale batch A',
        amount: 185000,
        paymentMethod: 'Bank Transfer',
        referenceNumber: 'INV-1001',
      },
      {
        date: '2026-11-05',
        type: 'expense' as const,
        landId: 'land-1',
        cropId: 'crop-1',
        categoryId: 'cat-exp-1',
        description: 'NPK + Urea purchase',
        amount: 42500.5,
        paymentMethod: 'Cash',
      },
      {
        date: '2026-11-10',
        type: 'expense' as const,
        landId: 'land-2',
        categoryId: 'cat-exp-2',
        description: 'Estate clearing daily labour',
        amount: 18000,
        paymentMethod: 'Cash',
      },
    ]

    const now = '2026-11-18T08:00:00.000Z'
    const transactions: Transaction[] = rawInputs.map((input, i) => {
      const parsed = transactionInputSchema.parse(input)
      return {
        ...parsed,
        id: `tx-${i + 1}`,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      }
    })

    // 1. Financial summary invariants
    const summary = calculateFinancialSummary(transactions)
    assert.equal(summary.totalIncome, 185000)
    assert.equal(summary.totalExpenses, 60500.5)
    assert.equal(summary.netBalance, 124499.5)
    assert.match(formatLKR(summary.netBalance), /124,499\.50/)

    // 2. Pagination preserves full dataset accuracy while slicing views
    const page1 = paginateItems(transactions, 1, 2)
    assert.equal(page1.items.length, 2)
    assert.equal(page1.totalPages, 2)
    assert.equal(page1.hasNext, true)

    // 3. End-to-end ExcelJS workbook generation + binary buffer roundtrip
    const payload: ExportPayload = {
      transactions,
      fertilizerApplications: [],
      metadata: {
        landMap: new Map([
          ['land-1', 'Kandy Upper Block'],
          ['land-2', 'Matale Valley Plot'],
        ]),
        cropMap: new Map([['crop-1', 'Ginger']]),
        categoryMap: new Map([
          ['cat-inc-1', 'Ginger Sales'],
          ['cat-exp-1', 'Fertilizer & Nutrients'],
          ['cat-exp-2', 'Labour & Wages'],
        ]),
        fertilizerMap: new Map(),
      },
      options: { dataType: 'transactions', datePreset: 'this_month' },
      generatedAt: '18/11/2026, 02:00 PM',
      dateRangeLabel: 'This Month',
      dateRangeSpan: '01/11/2026 – 18/11/2026',
    }

    const wb = await buildExcelWorkbook(payload)
    const buffer = await wb.xlsx.writeBuffer()
    assert.ok(buffer.byteLength > 2000, 'Generated XLSX binary should be non-empty')

    // Reload generated binary with ExcelJS to guarantee valid OOXML structure
    const reloaded = new ExcelJS.Workbook()
    await reloaded.xlsx.load(buffer)

    const txSheet = reloaded.getWorksheet('Transactions')
    const summarySheet = reloaded.getWorksheet('Export Summary')
    assert.ok(txSheet, 'Transactions sheet must exist')
    assert.ok(summarySheet, 'Export Summary sheet must exist')
    assert.equal(txSheet.rowCount, 4) // 1 header + 3 transactions
    assert.equal(txSheet.getRow(2).getCell(4).value, 'Kandy Upper Block')
    assert.equal(txSheet.getRow(2).getCell(8).value, 185000)
    assert.equal(summarySheet.getCell('B17').value, 185000)
    assert.equal(summarySheet.getCell('B18').value, 60500.5)
    assert.equal(summarySheet.getCell('B19').value, 124499.5)
  })
})

describe('Integration Workflow: Fertilizer Schedule Lifecycle & ExcelJS Export', () => {
  it('computes due dates, classifies overdue/due_soon/completed statuses, and exports clean worksheet', async () => {
    const appDate = '2026-10-15'
    const nextDue = calculateDueDateFromInterval(appDate, '1_month')
    assert.equal(nextDue, '2026-11-15')
    assert.equal(getReminderIntervalLabel('1_month'), '1 Month')

    const parsed = fertilizerApplicationInputSchema.parse({
      landId: 'land-1',
      cropId: 'crop-1',
      fertilizerId: 'fert-urea',
      applicationDate: appDate,
      quantity: 50,
      unit: 'kg',
      cost: 12500,
      reminderInterval: '1_month',
      nextDueDate: nextDue,
      status: 'scheduled',
      notes: 'Basal dressing after rain',
    })

    const app: FertilizerApplication = {
      ...parsed,
      id: 'fa-1',
      createdAt: '2026-10-15T06:00:00.000Z',
      updatedAt: '2026-10-15T06:00:00.000Z',
    }

    // Evaluated on 2026-11-18 -> 3 days overdue
    const overdueStatus = getFertilizerDueStatus(app.nextDueDate!, '2026-11-18')
    assert.equal(overdueStatus.status, 'overdue')
    assert.equal(overdueStatus.daysRemaining, -3)

    // Evaluated on 2026-11-12 -> due soon (3 days away)
    const dueSoonStatus = getFertilizerDueStatus(app.nextDueDate!, '2026-11-12')
    assert.equal(dueSoonStatus.status, 'due_soon')
    assert.equal(dueSoonStatus.daysRemaining, 3)

    // Once marked completed -> excluded by evaluateFertilizerReminders
    const completedApp: FertilizerApplication = { ...app, id: 'fa-2', status: 'completed' }
    const activeReminders = evaluateFertilizerReminders([app, completedApp], '2026-11-18')
    assert.equal(activeReminders.length, 1)
    assert.equal(activeReminders[0].application.id, 'fa-1')
    assert.equal(activeReminders[0].status, 'overdue')

    // Export both sheets + summary
    const wb = await buildExcelWorkbook({
      transactions: [],
      fertilizerApplications: [app, completedApp],
      metadata: {
        landMap: new Map([['land-1', 'Kandy Upper Block']]),
        cropMap: new Map([['crop-1', 'Ginger']]),
        categoryMap: new Map(),
        fertilizerMap: new Map([['fert-urea', 'Urea 46% N']]),
      },
      options: { dataType: 'fertilizer', datePreset: 'all_records' },
      generatedAt: '18/11/2026, 02:05 PM',
      dateRangeLabel: 'All Records',
      dateRangeSpan: 'All available records in database',
    })

    const fertSheet = wb.getWorksheet('Fertilizer Applications')
    assert.ok(fertSheet)
    assert.equal(fertSheet.rowCount, 3) // 1 header + 2 rows
    assert.equal(fertSheet.getRow(2).getCell(4).value, 'Urea 46% N')
    assert.equal(fertSheet.getRow(2).getCell(6).value, '1 Month')
    assert.equal(fertSheet.getRow(2).getCell(8).value, 50)
    assert.equal(fertSheet.getRow(2).getCell(11).value, 'Scheduled')
    assert.equal(fertSheet.getRow(3).getCell(11).value, 'Completed')
  })
})

describe('Integration Workflow: Offline-to-Online Sync Regression (STB-01)', () => {
  it('reconciles offline additions, concurrent timestamp edits, and pending deletions without resurrection', () => {
    interface TestRecord {
      id: string
      name: string
      updatedAt: string
    }

    const local: TestRecord[] = [
      { id: 'rec-local-only', name: 'Offline Expense', updatedAt: '2026-11-18T09:00:00.000Z' },
      { id: 'rec-conflict-local-wins', name: 'Local Newer Title', updatedAt: '2026-11-18T10:30:00.000Z' },
      { id: 'rec-conflict-remote-wins', name: 'Stale Local Title', updatedAt: '2026-11-18T07:00:00.000Z' },
    ]

    const remote: TestRecord[] = [
      { id: 'rec-remote-only', name: 'Synced From Desktop', updatedAt: '2026-11-18T08:00:00.000Z' },
      { id: 'rec-conflict-local-wins', name: 'Older Remote Title', updatedAt: '2026-11-18T09:00:00.000Z' },
      { id: 'rec-conflict-remote-wins', name: 'Fresh Remote Title', updatedAt: '2026-11-18T11:00:00.000Z' },
      { id: 'rec-deleted-offline', name: 'Should Not Resurrect', updatedAt: '2026-11-18T12:00:00.000Z' },
    ]

    const pendingDeletions = new Set(['rec-deleted-offline'])
    const plan = reconcileRecords(local, remote, pendingDeletions)

    // Remote-only and remote-newer records should be written to local Dexie
    const localPutIds = plan.toPutLocal.map((r) => r.id).sort()
    assert.deepEqual(localPutIds, ['rec-conflict-remote-wins', 'rec-remote-only'])
    assert.equal(
      plan.toPutLocal.find((r) => r.id === 'rec-conflict-remote-wins')?.name,
      'Fresh Remote Title'
    )

    // Local-only and local-newer records should be pushed to Supabase
    const remoteUpsertIds = plan.toUpload.map((r) => r.id).sort()
    assert.deepEqual(remoteUpsertIds, ['rec-conflict-local-wins', 'rec-local-only'])
    assert.equal(
      plan.toUpload.find((r) => r.id === 'rec-conflict-local-wins')?.name,
      'Local Newer Title'
    )

    // Deleted tombstone must NEVER appear in merged, toPutLocal, or toUpload
    assert.equal(
      plan.merged.some((r) => r.id === 'rec-deleted-offline'),
      false
    )
    assert.equal(
      plan.toPutLocal.some((r) => r.id === 'rec-deleted-offline'),
      false
    )
    assert.equal(
      plan.toUpload.some((r) => r.id === 'rec-deleted-offline'),
      false
    )

    // FK delete order: child tables must precede parent tables
    assert.ok(DELETE_SYNC_ORDER.indexOf('transactions') < DELETE_SYNC_ORDER.indexOf('lands'))
    assert.ok(
      DELETE_SYNC_ORDER.indexOf('fertilizer_applications') <
        DELETE_SYNC_ORDER.indexOf('fertilizers')
    )
    assert.ok(DELETE_SYNC_ORDER.indexOf('land_crops') < DELETE_SYNC_ORDER.indexOf('crops'))
  })
})

describe('Integration Workflow: Category CSV Import, Duplicate Audit & Smart Suggestions', () => {
  it('parses CSV categories, validates duplicates against existing catalog, detects clusters, and suggests categories', () => {
    const existing: Category[] = ALL_DEFAULT_CATEGORIES.slice(0, 6).map((c, i) => ({
      id: `cat-${i + 1}`,
      name: c.name,
      type: c.type,
      keywords: c.keywords,
      isDefault: true,
      isActive: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    }))

    const csv = [
      'name,type,keywords',
      'Solar Pump Maintenance,expense,"solar,pump,inverter"',
      'Labour & Wages,expense,"workers,daily pay"',
      'Solar Pump Maintenance,expense,"duplicate in file"',
    ].join('\n')

    const parsed = parseCategoryCsv(csv)
    assert.equal(parsed.length, 3)

    const validated = validateCategoryRows(parsed, existing)
    assert.equal(validated[0].isValid, true)
    assert.equal(validated[0].isExistingInDb, false)
    assert.equal(validated[1].isExistingInDb, true)
    assert.equal(validated[2].isDuplicateInFile, true)

    // Duplicate detection on similar categories
    const auditCategories: Category[] = [
      ...existing,
      {
        id: 'cat-dup',
        name: 'Labor and Wages',
        type: 'expense',
        keywords: ['wage'],
        isDefault: false,
        isActive: true,
        createdAt: '2026-11-02T00:00:00.000Z',
        updatedAt: '2026-11-02T00:00:00.000Z',
      },
    ]

    const report = auditCategoryDuplicates(auditCategories, [])
    assert.ok(report.groups.length >= 1, 'Should detect Labour & Wages vs Labor and Wages cluster')

    // Suggestion engine matches imported category keywords
    const suggestion = suggestCategory({
      description: 'Paid for solar pump repair',
      type: 'expense',
      categories: [
        ...existing,
        {
          id: 'cat-solar',
          name: 'Solar Pump Maintenance',
          type: 'expense',
          keywords: ['solar', 'pump', 'inverter'],
          isDefault: false,
          isActive: true,
          createdAt: '2026-11-18T00:00:00.000Z',
          updatedAt: '2026-11-18T00:00:00.000Z',
        },
      ],
      crops: [],
    })

    assert.equal(suggestion?.categoryName, 'Solar Pump Maintenance')
  })
})
