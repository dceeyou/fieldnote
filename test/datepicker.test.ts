import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  formatDateDDMMYYYY,
  getTodayColombo,
  addDays,
  addMonths,
} from '../src/utils/date.ts'

describe('Modern Calendar Grid Arithmetic (Monday First)', () => {
  function computeMonthGrid(year: number, month: number) {
    const firstDay = new Date(Date.UTC(year, month - 1, 1))
    const startDayIndex = (firstDay.getUTCDay() + 6) % 7 // Monday = 0, Sunday = 6
    const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const prevMonthTotalDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()

    const cells: { date: string; isCurrentMonth: boolean; dayNumber: number }[] = []

    // 1. Leading days from previous month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i
      const prevM = month === 1 ? 12 : month - 1
      const prevY = month === 1 ? year - 1 : year
      cells.push({
        date: `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        dayNumber: day,
      })
    }

    // 2. Current month days
    for (let day = 1; day <= totalDays; day++) {
      cells.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: true,
        dayNumber: day,
      })
    }

    // 3. Trailing days from next month
    let nextDay = 1
    while (cells.length % 7 !== 0 || cells.length < 35) {
      const nextM = month === 12 ? 1 : month + 1
      const nextY = month === 12 ? year + 1 : year
      cells.push({
        date: `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`,
        isCurrentMonth: false,
        dayNumber: nextDay,
      })
      nextDay++
    }

    return cells
  }

  it('sets Monday as the first day of the week', () => {
    // Nov 1 2026 is a Sunday (index 6 in Mon-first)
    const grid = computeMonthGrid(2026, 11)
    assert.strictEqual(grid.length % 7, 0)
    // First cell is Monday Oct 26
    assert.strictEqual(grid[0].date, '2026-10-26')
    assert.strictEqual(grid[0].dayNumber, 26)
    assert.strictEqual(grid[0].isCurrentMonth, false)

    // Nov 1 is at index 6 (Sunday)
    assert.strictEqual(grid[6].date, '2026-11-01')
    assert.strictEqual(grid[6].dayNumber, 1)
    assert.strictEqual(grid[6].isCurrentMonth, true)
  })

  it('computes correct 29 days for February in a leap year (2024)', () => {
    const grid = computeMonthGrid(2024, 2)
    const currentMonthDays = grid.filter((c) => c.isCurrentMonth)
    assert.strictEqual(currentMonthDays.length, 29)
    assert.strictEqual(currentMonthDays[28].date, '2024-02-29')
  })

  it('computes correct 28 days for February in a non-leap year (2026)', () => {
    const grid = computeMonthGrid(2026, 2)
    const currentMonthDays = grid.filter((c) => c.isCurrentMonth)
    assert.strictEqual(currentMonthDays.length, 28)
    assert.strictEqual(currentMonthDays[27].date, '2026-02-28')
  })

  it('handles year boundary transition from December to January', () => {
    const decGrid = computeMonthGrid(2026, 12)
    const janTrailing = decGrid.filter((c) => !c.isCurrentMonth && c.date.startsWith('2027-01'))
    assert.ok(janTrailing.length > 0)
    assert.strictEqual(janTrailing[0].date, '2027-01-01')
  })
})

describe('Date Formatting & Display Rules', () => {
  it('formats dates consistently in DD/MM/YYYY format', () => {
    assert.strictEqual(formatDateDDMMYYYY('2026-11-17'), '17/11/2026')
    assert.strictEqual(formatDateDDMMYYYY('2026-04-05'), '05/04/2026')
    assert.strictEqual(formatDateDDMMYYYY('2026-12-31'), '31/12/2026')
  })

  it('returns valid ISO date string for today in Asia/Colombo', () => {
    const today = getTodayColombo()
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/)
  })

  it('performs calendar date additions without timezone shift', () => {
    assert.strictEqual(addDays('2026-11-17', 7), '2026-11-24')
    assert.strictEqual(addDays('2026-11-30', 1), '2026-12-01')
    assert.strictEqual(addMonths('2026-01-31', 1), '2026-02-28')
    assert.strictEqual(addMonths('2024-01-31', 1), '2024-02-29')
  })
})

describe('Custom Date Range Selection Logic', () => {
  function evaluateRangeSelection(
    currentStart: string,
    currentEnd: string,
    clickedDate: string
  ): { startDate: string; endDate: string } {
    if (!currentStart || (currentStart && currentEnd)) {
      // Start a new range
      return { startDate: clickedDate, endDate: '' }
    }
    if (clickedDate < currentStart) {
      // Earlier date clicked -> becomes new start date
      return { startDate: clickedDate, endDate: '' }
    }
    // Valid end date
    return { startDate: currentStart, endDate: clickedDate }
  }

  it('begins new selection on first date click', () => {
    const result = evaluateRangeSelection('', '', '2026-11-05')
    assert.strictEqual(result.startDate, '2026-11-05')
    assert.strictEqual(result.endDate, '')
  })

  it('completes valid range when second date is on or after start date', () => {
    const result = evaluateRangeSelection('2026-11-05', '', '2026-11-20')
    assert.strictEqual(result.startDate, '2026-11-05')
    assert.strictEqual(result.endDate, '2026-11-20')
  })

  it('prevents invalid end date by resetting start date when clicked date is earlier', () => {
    const result = evaluateRangeSelection('2026-11-15', '', '2026-11-02')
    assert.strictEqual(result.startDate, '2026-11-02')
    assert.strictEqual(result.endDate, '')
  })

  it('correctly evaluates intermediate dates inside selected range', () => {
    const start = '2026-11-10'
    const end = '2026-11-20'

    const testInside = '2026-11-15'
    const testBefore = '2026-11-05'
    const testAfter = '2026-11-25'

    assert.ok(testInside >= start && testInside <= end)
    assert.ok(!(testBefore >= start && testBefore <= end))
    assert.ok(!(testAfter >= start && testAfter <= end))
  })
})
