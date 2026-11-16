import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  fertilizerInputSchema,
  fertilizerApplicationInputSchema,
} from '../src/domain/validation.ts'
import type { Fertilizer, FertilizerApplication } from '../src/data/db/schema.ts'
import {
  calculateDueDateFromInterval,
  inferReminderInterval,
  formatDateDDMMYYYY,
  addMonths,
  addYears,
  getReminderIntervalLabel,
  type ReminderInterval,
} from '../src/utils/date.ts'
import { getFertilizerDueStatus } from '../src/utils/reminders.ts'

describe('Fertilizer Product Input Validation', () => {
  it('validates a valid fertilizer product input', () => {
    const input = {
      name: 'Urea 46%',
      type: 'Inorganic',
      defaultUnit: 'kg',
      notes: 'High nitrogen source',
      isActive: true,
    }
    const result = fertilizerInputSchema.parse(input)
    assert.strictEqual(result.name, 'Urea 46%')
    assert.strictEqual(result.type, 'Inorganic')
    assert.strictEqual(result.defaultUnit, 'kg')
    assert.strictEqual(result.notes, 'High nitrogen source')
    assert.strictEqual(result.isActive, true)
  })

  it('rejects an empty fertilizer name', () => {
    assert.throws(() => {
      fertilizerInputSchema.parse({
        name: '   ',
        type: 'Inorganic',
        defaultUnit: 'kg',
      })
    })
  })

  it('allows optional type, notes, and defaultUnit', () => {
    const minimal = {
      name: 'Dolomite',
    }
    const result = fertilizerInputSchema.parse(minimal)
    assert.strictEqual(result.name, 'Dolomite')
    assert.strictEqual(result.type, undefined)
    assert.strictEqual(result.notes, undefined)
    assert.strictEqual(result.isActive, true)
  })
})

describe('Fertilizer Product Reference & Archival Rules', () => {
  function checkProductDeletionPolicy(
    product: Fertilizer,
    applications: FertilizerApplication[]
  ): { canDelete: boolean; shouldArchive: boolean; referenceCount: number } {
    const refCount = applications.filter((app) => app.fertilizerId === product.id).length
    if (refCount > 0) {
      return { canDelete: false, shouldArchive: true, referenceCount: refCount }
    }
    return { canDelete: true, shouldArchive: false, referenceCount: 0 }
  }

  it('identifies unreferenced fertilizer products as safe to permanently delete', () => {
    const product: Fertilizer = {
      id: 'fert-unused',
      name: 'Unused Fertilizer Brand',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const applications: FertilizerApplication[] = []

    const policy = checkProductDeletionPolicy(product, applications)
    assert.strictEqual(policy.canDelete, true)
    assert.strictEqual(policy.shouldArchive, false)
    assert.strictEqual(policy.referenceCount, 0)
  })

  it('protects referenced products from permanent deletion and mandates archival', () => {
    const product: Fertilizer = {
      id: 'fert-1',
      name: 'Urea 46%',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const applications: FertilizerApplication[] = [
      {
        id: 'app-1',
        landId: 'land-1',
        cropId: 'crop-1',
        fertilizerId: 'fert-1',
        applicationDate: '2026-11-01',
        status: 'scheduled',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ]

    const policy = checkProductDeletionPolicy(product, applications)
    assert.strictEqual(policy.canDelete, false)
    assert.strictEqual(policy.shouldArchive, true)
    assert.strictEqual(policy.referenceCount, 1)
  })
})

describe('Reminder Interval Automatic Calculations', () => {
  const baseDate = '2026-05-10'

  it('calculates 7 Days = Application Date + 7 calendar days', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, '7_days'), '2026-05-17')
  })

  it('calculates 14 Days = Application Date + 14 calendar days', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, '14_days'), '2026-05-24')
  })

  it('calculates 3 Weeks = Application Date + 21 calendar days', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, '3_weeks'), '2026-05-31')
  })

  it('calculates 1 Month = Application Date + 1 calendar month', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, '1_month'), '2026-06-10')
  })

  it('calculates 3 Months = Application Date + 3 calendar months', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, '3_months'), '2026-08-10')
  })

  it('calculates 6 Months = Application Date + 6 calendar months', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, '6_months'), '2026-11-10')
  })

  it('calculates 1 Year = Application Date + 1 calendar year', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, '1_year'), '2027-05-10')
  })

  it('returns null for custom date interval', () => {
    assert.strictEqual(calculateDueDateFromInterval(baseDate, 'custom'), null)
  })
})

describe('Month-End & Leap-Year Date Clamping', () => {
  it('correctly clamps Jan 31 + 1 month to Feb 28 in a non-leap year (2026)', () => {
    assert.strictEqual(addMonths('2026-01-31', 1), '2026-02-28')
    assert.strictEqual(calculateDueDateFromInterval('2026-01-31', '1_month'), '2026-02-28')
  })

  it('correctly clamps Jan 31 + 1 month to Feb 29 in a leap year (2024)', () => {
    assert.strictEqual(addMonths('2024-01-31', 1), '2024-02-29')
    assert.strictEqual(calculateDueDateFromInterval('2024-01-31', '1_month'), '2024-02-29')
  })

  it('correctly clamps Mar 31 + 1 month to Apr 30 (30-day month)', () => {
    assert.strictEqual(addMonths('2026-03-31', 1), '2026-04-30')
    assert.strictEqual(calculateDueDateFromInterval('2026-03-31', '1_month'), '2026-04-30')
  })

  it('correctly clamps Aug 31 + 6 months to Feb 28 of the following year (2027)', () => {
    assert.strictEqual(addMonths('2026-08-31', 6), '2027-02-28')
    assert.strictEqual(calculateDueDateFromInterval('2026-08-31', '6_months'), '2027-02-28')
  })

  it('correctly clamps Feb 29 leap-day + 1 year to Feb 28', () => {
    assert.strictEqual(addYears('2024-02-29', 1), '2025-02-28')
    assert.strictEqual(calculateDueDateFromInterval('2024-02-29', '1_year'), '2025-02-28')
  })

  it('handles year boundary rollover (Dec 15 + 1 month = Jan 15 of next year)', () => {
    assert.strictEqual(addMonths('2026-12-15', 1), '2027-01-15')
    assert.strictEqual(calculateDueDateFromInterval('2026-12-15', '1_month'), '2027-01-15')
  })
})

describe('Application Date Changes & Edit Mode Preservation', () => {
  it('recalculates due date when application date changes with predefined interval', () => {
    const originalDate = '2026-03-01'
    const updatedDate = '2026-04-15'
    const interval: ReminderInterval = '1_month'

    const originalDue = calculateDueDateFromInterval(originalDate, interval)
    const updatedDue = calculateDueDateFromInterval(updatedDate, interval)

    assert.strictEqual(originalDue, '2026-04-01')
    assert.strictEqual(updatedDue, '2026-05-15')
  })

  it('preserves stored reminderInterval when editing existing record', () => {
    const appDate = '2026-06-01'
    const storedDueDate = '2026-09-01'
    const storedInterval = '3_months'

    const interval = inferReminderInterval(appDate, storedDueDate, storedInterval)
    assert.strictEqual(interval, '3_months')
  })

  it('infers matching predefined interval for legacy records without stored interval', () => {
    const appDate = '2026-06-01'
    // Matches 1_month exactly
    const dueDate = '2026-07-01'

    const interval = inferReminderInterval(appDate, dueDate, undefined)
    assert.strictEqual(interval, '1_month')
  })

  it('falls back to custom without overwriting when legacy record has an arbitrary due date', () => {
    const appDate = '2026-06-01'
    // 19 days later does not match 7d, 14d, 3w, 1mo, etc.
    const dueDate = '2026-06-20'

    const interval = inferReminderInterval(appDate, dueDate, undefined)
    assert.strictEqual(interval, 'custom')
  })

  it('formats dates in standard DD/MM/YYYY representation', () => {
    assert.strictEqual(formatDateDDMMYYYY('2026-11-17'), '17/11/2026')
    assert.strictEqual(formatDateDDMMYYYY('2026-01-05'), '05/01/2026')
    assert.strictEqual(formatDateDDMMYYYY('invalid'), 'invalid')
  })

  it('maps interval keys to user-facing labels', () => {
    assert.strictEqual(getReminderIntervalLabel('7_days'), '7 Days')
    assert.strictEqual(getReminderIntervalLabel('14_days'), '14 Days')
    assert.strictEqual(getReminderIntervalLabel('3_weeks'), '3 Weeks')
    assert.strictEqual(getReminderIntervalLabel('1_month'), '1 Month')
    assert.strictEqual(getReminderIntervalLabel('3_months'), '3 Months')
    assert.strictEqual(getReminderIntervalLabel('6_months'), '6 Months')
    assert.strictEqual(getReminderIntervalLabel('1_year'), '1 Year')
    assert.strictEqual(getReminderIntervalLabel('custom'), 'Custom Date')
  })
})

describe('Custom Date Selection & Validation Rules', () => {
  it('validates application input schema with reminderInterval and dates', () => {
    const valid = {
      landId: 'land-123',
      cropId: 'crop-456',
      fertilizerId: 'fert-789',
      applicationDate: '2026-11-17',
      reminderInterval: '1_month',
      nextDueDate: '2026-12-17',
      status: 'scheduled' as const,
    }
    const result = fertilizerApplicationInputSchema.parse(valid)
    assert.strictEqual(result.reminderInterval, '1_month')
    assert.strictEqual(result.nextDueDate, '2026-12-17')
  })

  it('enforces that due date must not be earlier than application date', () => {
    const appDate = '2026-11-20'
    const invalidDueDate = '2026-11-10'
    const isInvalid = invalidDueDate < appDate
    assert.strictEqual(isInvalid, true)

    const validDueDate = '2026-11-25'
    const isValid = validDueDate >= appDate
    assert.strictEqual(isValid, true)
  })

  it('evaluates reminder status correctly for calculated due dates', () => {
    const today = '2026-11-17'

    // Due in 5 days -> due_soon
    const dueSoonDate = '2026-11-22'
    const statusSoon = getFertilizerDueStatus(dueSoonDate, today)
    assert.strictEqual(statusSoon.status, 'due_soon')
    assert.strictEqual(statusSoon.daysRemaining, 5)

    // Overdue by 3 days -> overdue
    const overdueDate = '2026-11-14'
    const statusOverdue = getFertilizerDueStatus(overdueDate, today)
    assert.strictEqual(statusOverdue.status, 'overdue')
    assert.strictEqual(statusOverdue.daysRemaining, -3)

    // Due in 30 days -> upcoming
    const upcomingDate = '2026-12-17'
    const statusUpcoming = getFertilizerDueStatus(upcomingDate, today)
    assert.strictEqual(statusUpcoming.status, 'upcoming')
    assert.strictEqual(statusUpcoming.daysRemaining, 30)
  })
})
