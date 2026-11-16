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
 * Formats a YYYY-MM-DD string into a human-readable format.
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
 * Add or subtract calendar days to a YYYY-MM-DD date string.
 */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
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
