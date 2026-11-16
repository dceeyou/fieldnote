import type { FertilizerApplication } from '../data/db/schema.ts'
import { diffCalendarDays, getTodayColombo } from './date.ts'

export type ReminderStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming'

export interface FertilizerReminder {
  application: FertilizerApplication
  status: ReminderStatus
  daysRemaining: number // negative if overdue, 0 if today, positive if future
}

/**
 * Determine the reminder status of an application based on a target reference date (defaulting to today in Asia/Colombo).
 */
export function getFertilizerDueStatus(
  nextDueDate: string,
  referenceDate: string = getTodayColombo()
): { status: ReminderStatus; daysRemaining: number } {
  const daysRemaining = diffCalendarDays(referenceDate, nextDueDate)

  let status: ReminderStatus
  if (daysRemaining < 0) {
    status = 'overdue'
  } else if (daysRemaining === 0) {
    status = 'due_today'
  } else if (daysRemaining <= 7) {
    status = 'due_soon'
  } else {
    status = 'upcoming'
  }

  return { status, daysRemaining }
}

/**
 * Filters and categorizes active fertilizer applications into reminders.
 * Completed and cancelled records are excluded.
 */
export function evaluateFertilizerReminders(
  applications: FertilizerApplication[],
  referenceDate: string = getTodayColombo()
): FertilizerReminder[] {
  const activeReminders: FertilizerReminder[] = []

  for (const app of applications) {
    // Only scheduled applications with a nextDueDate can generate reminders
    if (app.status !== 'scheduled' || !app.nextDueDate) {
      continue
    }

    const { status, daysRemaining } = getFertilizerDueStatus(app.nextDueDate, referenceDate)
    activeReminders.push({
      application: app,
      status,
      daysRemaining,
    })
  }

  // Sort by priority: overdue first (most overdue first), then due today, then due soon, then upcoming
  return activeReminders.sort((a, b) => a.daysRemaining - b.daysRemaining)
}
