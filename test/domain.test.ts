import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  convertAreaToAcres,
  calculateFinancialSummary,
  PERCHES_PER_ACRE,
} from '../src/utils/calculations.ts'
import {
  diffCalendarDays,
  addDays,
  getTodayColombo,
} from '../src/utils/date.ts'
import {
  getFertilizerDueStatus,
  evaluateFertilizerReminders,
} from '../src/utils/reminders.ts'
import {
  transactionInputSchema,
  landInputSchema,
} from '../src/domain/validation.ts'
import { validateBackup } from '../src/services/backupService.ts'
import {
  parseCsvText,
  detectColumnMapping,
  checkDuplicate,
} from '../src/services/importService.ts'
import type { FertilizerApplication, Transaction } from '../src/data/db/schema.ts'

describe('Area conversion', () => {
  it('has PERCHES_PER_ACRE constant defined as 160', () => {
    assert.strictEqual(PERCHES_PER_ACRE, 160)
  })

  it('converts perches to acres correctly (160 perches = 1 acre)', () => {
    assert.strictEqual(convertAreaToAcres(160, 'perch'), 1)
    assert.strictEqual(convertAreaToAcres(80, 'perch'), 0.5)
    assert.strictEqual(convertAreaToAcres(40, 'perch'), 0.25)
  })

  it('keeps acre values directly', () => {
    assert.strictEqual(convertAreaToAcres(2.5, 'acre'), 2.5)
  })

  it('handles undefined or null values safely', () => {
    assert.strictEqual(convertAreaToAcres(undefined), undefined)
  })
})

describe('Financial calculations', () => {
  it('derives total income, total expenses and net balance accurately', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-11-01',
        type: 'income',
        landId: 'land-1',
        categoryId: 'cat-1',
        description: 'Crop harvest sale',
        amount: 150000,
        source: 'manual',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2026-11-02',
        type: 'expense',
        landId: 'land-1',
        categoryId: 'cat-2',
        description: 'Fertilizer purchase',
        amount: 35000,
        source: 'manual',
        createdAt: '2026-11-02T00:00:00Z',
        updatedAt: '2026-11-02T00:00:00Z',
      },
      {
        id: '3',
        date: '2026-11-05',
        type: 'expense',
        landId: 'land-2',
        categoryId: 'cat-3',
        description: 'Labor payment',
        amount: 25000,
        source: 'manual',
        createdAt: '2026-11-05T00:00:00Z',
        updatedAt: '2026-11-05T00:00:00Z',
      },
    ]

    const summary = calculateFinancialSummary(transactions)
    assert.strictEqual(summary.totalIncome, 150000)
    assert.strictEqual(summary.totalExpenses, 60000)
    assert.strictEqual(summary.netBalance, 90000)
    assert.strictEqual(summary.transactionCount, 3)
  })

  it('returns zeros for empty transaction list', () => {
    const summary = calculateFinancialSummary([])
    assert.strictEqual(summary.totalIncome, 0)
    assert.strictEqual(summary.totalExpenses, 0)
    assert.strictEqual(summary.netBalance, 0)
    assert.strictEqual(summary.transactionCount, 0)
  })
})

describe('Date utilities', () => {
  it('calculates calendar day differences accurately across months', () => {
    assert.strictEqual(diffCalendarDays('2026-11-10', '2026-11-15'), 5)
    assert.strictEqual(diffCalendarDays('2026-11-15', '2026-11-10'), -5)
    assert.strictEqual(diffCalendarDays('2026-11-01', '2026-11-01'), 0)
    assert.strictEqual(diffCalendarDays('2026-10-31', '2026-11-01'), 1)
  })

  it('adds calendar days correctly', () => {
    assert.strictEqual(addDays('2026-11-10', 7), '2026-11-17')
    assert.strictEqual(addDays('2026-11-30', 1), '2026-12-01')
  })

  it('returns a valid YYYY-MM-DD for today in Asia/Colombo', () => {
    const today = getTodayColombo()
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('Fertilizer reminder rules', () => {
  const referenceDate = '2026-11-16'

  it('correctly categorizes overdue application', () => {
    const result = getFertilizerDueStatus('2026-11-15', referenceDate)
    assert.strictEqual(result.status, 'overdue')
    assert.strictEqual(result.daysRemaining, -1)
  })

  it('correctly categorizes due_today application', () => {
    const result = getFertilizerDueStatus('2026-11-16', referenceDate)
    assert.strictEqual(result.status, 'due_today')
    assert.strictEqual(result.daysRemaining, 0)
  })

  it('correctly categorizes due_soon application (within next 7 days)', () => {
    const result = getFertilizerDueStatus('2026-11-20', referenceDate)
    assert.strictEqual(result.status, 'due_soon')
    assert.strictEqual(result.daysRemaining, 4)

    const boundary = getFertilizerDueStatus('2026-11-23', referenceDate) // exactly 7 days
    assert.strictEqual(boundary.status, 'due_soon')
    assert.strictEqual(boundary.daysRemaining, 7)
  })

  it('correctly categorizes upcoming application (after 7 days)', () => {
    const result = getFertilizerDueStatus('2026-11-25', referenceDate)
    assert.strictEqual(result.status, 'upcoming')
    assert.strictEqual(result.daysRemaining, 9)
  })

  it('evaluates reminders list and excludes completed and cancelled items', () => {
    const apps: FertilizerApplication[] = [
      {
        id: 'app-1',
        landId: 'land-1',
        cropId: 'crop-1',
        fertilizerId: 'fert-1',
        applicationDate: '2026-10-15',
        nextDueDate: '2026-11-10', // overdue
        status: 'scheduled',
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
      },
      {
        id: 'app-2',
        landId: 'land-1',
        cropId: 'crop-1',
        fertilizerId: 'fert-2',
        applicationDate: '2026-10-16',
        nextDueDate: '2026-11-16', // due today
        status: 'scheduled',
        createdAt: '2026-10-16T00:00:00Z',
        updatedAt: '2026-10-16T00:00:00Z',
      },
      {
        id: 'app-3',
        landId: 'land-1',
        cropId: 'crop-1',
        fertilizerId: 'fert-1',
        applicationDate: '2026-10-10',
        nextDueDate: '2026-11-05', // completed: should be ignored!
        status: 'completed',
        createdAt: '2026-10-10T00:00:00Z',
        updatedAt: '2026-10-10T00:00:00Z',
      },
      {
        id: 'app-4',
        landId: 'land-1',
        cropId: 'crop-1',
        fertilizerId: 'fert-1',
        applicationDate: '2026-10-10',
        nextDueDate: '2026-11-05', // cancelled: should be ignored!
        status: 'cancelled',
        createdAt: '2026-10-10T00:00:00Z',
        updatedAt: '2026-10-10T00:00:00Z',
      },
    ]

    const reminders = evaluateFertilizerReminders(apps, referenceDate)
    assert.strictEqual(reminders.length, 2)
    assert.strictEqual(reminders[0].status, 'overdue')
    assert.strictEqual(reminders[1].status, 'due_today')
  })
})

describe('Validation rules', () => {
  it('requires land selection on transactions (mandatory business rule)', () => {
    const invalidTransaction = {
      date: '2026-11-16',
      type: 'expense',
      landId: '', // Empty land
      categoryId: 'cat-1',
      description: 'Fertilizer sack',
      amount: 4500,
    }

    const result = transactionInputSchema.safeParse(invalidTransaction)
    assert.strictEqual(result.success, false)
    if (!result.success) {
      const issues = result.error.issues || []
      const landError = issues.find((e) => e.path.includes('landId'))
      assert.ok(landError, 'Expected validation error on missing landId')
    }
  })

  it('allows optional crop on transactions', () => {
    const validWithoutCrop = {
      date: '2026-11-16',
      type: 'expense',
      landId: 'land-123',
      categoryId: 'cat-1',
      description: 'Land fencing repair',
      amount: 12000,
    }

    const result = transactionInputSchema.safeParse(validWithoutCrop)
    assert.strictEqual(result.success, true)
  })

  it('rejects zero or negative transaction amounts', () => {
    const zeroAmount = {
      date: '2026-11-16',
      type: 'income',
      landId: 'land-123',
      categoryId: 'cat-1',
      description: 'Sale',
      amount: 0,
    }

    const res1 = transactionInputSchema.safeParse(zeroAmount)
    assert.strictEqual(res1.success, false)

    const negativeAmount = {
      ...zeroAmount,
      amount: -500,
    }
    const res2 = transactionInputSchema.safeParse(negativeAmount)
    assert.strictEqual(res2.success, false)
  })

  it('validates land input schema correctly', () => {
    const invalidLand = { name: '' }
    assert.strictEqual(landInputSchema.safeParse(invalidLand).success, false)

    const validLand = { name: 'Upper Estate', areaValue: 3, areaUnit: 'acre' }
    assert.strictEqual(landInputSchema.safeParse(validLand).success, true)
  })
})

describe('Backup validation', () => {
  it('validates correct backup payload', () => {
    const valid = {
      version: 1,
      appName: 'Fieldnote - Agriculture Management',
      exportedAt: '2026-11-16T00:00:00Z',
      data: {
        lands: [],
        crops: [],
        landCrops: [],
        categories: [],
        transactions: [],
        fertilizers: [],
        fertilizerApplications: [],
        settings: [],
      },
    }
    const res = validateBackup(valid)
    assert.strictEqual(res.valid, true)
  })

  it('rejects unsupported backup version', () => {
    const wrongVersion = {
      version: 99,
      data: { lands: [] },
    }
    const res = validateBackup(wrongVersion)
    assert.strictEqual(res.valid, false)
    assert.match(res.error || '', /version/)
  })

  it('rejects invalid or corrupted payload', () => {
    assert.strictEqual(validateBackup(null).valid, false)
    assert.strictEqual(validateBackup({ version: 1 }).valid, false)
  })
})

describe('CSV Import pipeline', () => {
  it('parses CSV text into rows handling commas and quoted strings', () => {
    const csv = `Date,Type,Amount,Description,Land\n2026-11-01,expense,4500,"Urea fertilizer, 50kg bag",Estate A\n2026-11-02,income,120000,"Harvest sale",Estate A`
    const rows = parseCsvText(csv)
    assert.strictEqual(rows.length, 3)
    assert.strictEqual(rows[0][0], 'Date')
    assert.strictEqual(rows[1][3], 'Urea fertilizer, 50kg bag')
    assert.strictEqual(rows[1][4], 'Estate A')
    assert.strictEqual(rows[2][2], '120000')
  })

  it('detects standard column headers automatically', () => {
    const headers = ['Tx Date', 'Flow Type', 'Amount (LKR)', 'Description', 'Plot/Land', 'Category', 'Invoice #']
    const mapping = detectColumnMapping(headers)
    assert.strictEqual(mapping.dateCol, 0)
    assert.strictEqual(mapping.typeCol, 1)
    assert.strictEqual(mapping.amountCol, 2)
    assert.strictEqual(mapping.descCol, 3)
    assert.strictEqual(mapping.landCol, 4)
    assert.strictEqual(mapping.catCol, 5)
    assert.strictEqual(mapping.refCol, 6)
  })

  it('detects duplicate candidates based on date, amount, type and description', () => {
    const existing: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-11-10',
        type: 'expense',
        amount: 5000,
        description: 'Dolomite purchase',
        landId: 'land-1',
        categoryId: 'cat-1',
        source: 'manual',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
    ]

    const isDup = checkDuplicate('2026-11-10', 5000, 'expense', 'Dolomite purchase', existing)
    assert.strictEqual(isDup, true)

    const notDup = checkDuplicate('2026-11-11', 5000, 'expense', 'Dolomite purchase', existing)
    assert.strictEqual(notDup, false)
  })
})

describe('Bulk transaction operations', () => {
  it('correctly tracks selection set and bulk selection states', () => {
    const ids = ['tx-1', 'tx-2', 'tx-3']
    const selected = new Set(['tx-1', 'tx-2'])

    assert.strictEqual(ids.every((id) => selected.has(id)), false)
    assert.strictEqual(ids.some((id) => selected.has(id)), true)

    selected.add('tx-3')
    assert.strictEqual(ids.every((id) => selected.has(id)), true)

    selected.clear()
    assert.strictEqual(ids.some((id) => selected.has(id)), false)
  })
})


