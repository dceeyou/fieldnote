/**
 * Domain logic for Personalized Greeting Header & Timezone calculations (Asia/Colombo).
 */

export const MOTIVATIONAL_MESSAGES = [
  'Every small effort today creates a better harvest tomorrow.',
  'Great harvests begin with consistent care.',
  'Take care of your land, and it will reward you.',
  'Small steps today. Better growth tomorrow.',
  'Plan wisely, cultivate patiently, grow confidently.',
  'Every season is an opportunity to grow.',
  'Consistency today brings better results tomorrow.',
  'Healthy soil, thoughtful care and patience create lasting growth.',
] as const

/**
 * Extracts hour in 0-23 range in Asia/Colombo timezone.
 */
export function getColomboHour(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hourPart = parts.find((p) => p.type === 'hour')
  return hourPart ? parseInt(hourPart.value, 10) : 0
}

/**
 * Returns greeting string for a given hour (0-23).
 * Rules:
 * - 05:00–11:59: Good morning!
 * - 12:00–16:59: Good afternoon!
 * - 17:00–20:59: Good evening!
 * - 21:00–04:59: Working late? Take care!
 */
export function getGreetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return 'Good morning!'
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon!'
  }
  if (hour >= 17 && hour < 21) {
    return 'Good evening!'
  }
  return 'Working late? Take care!'
}

/**
 * Returns greeting string for the provided date in Asia/Colombo timezone.
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = getColomboHour(date)
  return getGreetingForHour(hour)
}

/**
 * Deterministically returns the daily motivational message for a calendar date in Asia/Colombo.
 */
export function getDailyMotivationalMessage(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '1970', 10)
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10)
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10)

  const daysSinceEpoch = Math.floor(Date.UTC(year, month - 1, day) / 86400000)
  const index = Math.abs(daysSinceEpoch) % MOTIVATIONAL_MESSAGES.length
  return MOTIVATIONAL_MESSAGES[index]
}

/**
 * Formats full current date in Asia/Colombo timezone.
 * Example: TUESDAY, 17 NOVEMBER 2026
 */
export function formatColomboDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(date)
    .toUpperCase()
}

/**
 * Formats current time in 12-hour format with AM/PM in Asia/Colombo timezone.
 * Example: 08:42 AM
 */
export function formatColomboTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(/\u202F/g, ' ')
}
