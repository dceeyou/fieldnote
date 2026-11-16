/**
 * Date utilities for Asia/Colombo timezone.
 * Calendar dates are stored as ISO date-only strings: YYYY-MM-DD
 */

export const COLOMBO_TIMEZONE = 'Asia/Colombo'

/**
 * Returns today's date in Asia/Colombo formatted as YYYY-MM-DD.
 */
export function getTodayColombo(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

/**
 * Returns current year and month as YYYY-MM in Asia/Colombo.
 */
export function getCurrentMonthColombo(): string {
  return getTodayColombo().slice(0, 7)
}

/**
 * Formats a YYYY-MM-DD string into a human-readable format (e.g. "Nov 16, 2026").
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

/**
 * Formats a YYYY-MM-DD string into standard DD/MM/YYYY format (e.g. "16/11/2026").
 */
export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Add or subtract calendar days to a YYYY-MM-DD date string.
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Add or subtract calendar months to a YYYY-MM-DD date string.
 * Handles month-end and leap-year clamping correctly (e.g., Jan 31 + 1 month = Feb 28/29).
 */
export function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const [year, month, day] = dateStr.split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) + months
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1 // 1 to 12

  // Determine total days in target month (day 0 of targetMonth+1 gives last day)
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  const clampedDay = Math.min(day, daysInTargetMonth)

  const mStr = String(targetMonth).padStart(2, '0')
  const dStr = String(clampedDay).padStart(2, '0')
  return `${targetYear}-${mStr}-${dStr}`
}

/**
 * Add or subtract calendar years to a YYYY-MM-DD date string.
 * Handles leap-year Feb 29 clamping correctly (e.g., Feb 29, 2024 + 1 year = Feb 28, 2025).
 */
export function addYears(dateStr: string, years: number): string {
  return addMonths(dateStr, years * 12)
}

/**
 * Calculate difference in calendar days between two YYYY-MM-DD dates (d2 - d1).
 */
export function diffCalendarDays(d1: string, d2: string): number {
  const [y1, m1, day1] = d1.split('-').map(Number)
  const [y2, m2, day2] = d2.split('-').map(Number)
  const utc1 = Date.UTC(y1, m1 - 1, day1)
  const utc2 = Date.UTC(y2, m2 - 1, day2)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((utc2 - utc1) / msPerDay)
}

// ============================================================================
// REMINDER INTERVAL DEFINITIONS & LOGIC
// ============================================================================

export type ReminderInterval =
  | '7_days'
  | '14_days'
  | '3_weeks'
  | '1_month'
  | '3_months'
  | '6_months'
  | '1_year'
  | 'custom'

export interface ReminderIntervalOption {
  value: ReminderInterval
  label: string
}

export const REMINDER_INTERVAL_OPTIONS: ReminderIntervalOption[] = [
  { value: '7_days', label: '7 Days' },
  { value: '14_days', label: '14 Days' },
  { value: '3_weeks', label: '3 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'custom', label: 'Custom Date' },
]

/**
 * Calculate Next Due Date based on application date and selected interval.
 * Returns null if interval is 'custom' or application date is invalid.
 */
export function calculateDueDateFromInterval(
  applicationDate: string,
  interval: ReminderInterval
): string | null {
  if (!applicationDate || !/^\d{4}-\d{2}-\d{2}$/.test(applicationDate)) return null

  switch (interval) {
    case '7_days':
      return addDays(applicationDate, 7)
    case '14_days':
      return addDays(applicationDate, 14)
    case '3_weeks':
      return addDays(applicationDate, 21)
    case '1_month':
      return addMonths(applicationDate, 1)
    case '3_months':
      return addMonths(applicationDate, 3)
    case '6_months':
      return addMonths(applicationDate, 6)
    case '1_year':
      return addYears(applicationDate, 1)
    case 'custom':
    default:
      return null
  }
}

/**
 * Resolves the interval to use when editing an existing application.
 * Preserves storedInterval if valid; otherwise checks if the existing dueDate matches any predefined interval.
 * If no match is found, safely defaults to 'custom'.
 */
export function inferReminderInterval(
  applicationDate: string,
  dueDate?: string,
  storedInterval?: string
): ReminderInterval {
  if (
    storedInterval &&
    REMINDER_INTERVAL_OPTIONS.some((opt) => opt.value === storedInterval)
  ) {
    return storedInterval as ReminderInterval
  }

  if (!dueDate || !applicationDate) return '1_month'

  // Check if dueDate exactly matches any predefined interval
  for (const opt of REMINDER_INTERVAL_OPTIONS) {
    if (opt.value === 'custom') continue
    const calculated = calculateDueDateFromInterval(applicationDate, opt.value)
    if (calculated === dueDate) {
      return opt.value
    }
  }

  return 'custom'
}

/**
 * Returns human-friendly interval label.
 */
export function getReminderIntervalLabel(interval?: string): string {
  const match = REMINDER_INTERVAL_OPTIONS.find((opt) => opt.value === interval)
  return match ? match.label : 'Custom'
}
