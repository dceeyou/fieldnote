import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MOTIVATIONAL_MESSAGES,
  getGreetingForHour,
  getGreeting,
  getColomboHour,
  getDailyMotivationalMessage,
  formatColomboDate,
  formatColomboTime,
} from '../src/domain/greeting.ts'

describe('Dynamic Time-based Greeting Rules', () => {
  it('returns "Good morning!" for 05:00 to 11:59', () => {
    assert.equal(getGreetingForHour(5), 'Good morning!')
    assert.equal(getGreetingForHour(8), 'Good morning!')
    assert.equal(getGreetingForHour(11), 'Good morning!')
  })

  it('returns "Good afternoon!" for 12:00 to 16:59', () => {
    assert.equal(getGreetingForHour(12), 'Good afternoon!')
    assert.equal(getGreetingForHour(14), 'Good afternoon!')
    assert.equal(getGreetingForHour(16), 'Good afternoon!')
  })

  it('returns "Good evening!" for 17:00 to 20:59', () => {
    assert.equal(getGreetingForHour(17), 'Good evening!')
    assert.equal(getGreetingForHour(19), 'Good evening!')
    assert.equal(getGreetingForHour(20), 'Good evening!')
  })

  it('returns "Working late? Take care!" for 21:00 to 04:59', () => {
    assert.equal(getGreetingForHour(21), 'Working late? Take care!')
    assert.equal(getGreetingForHour(23), 'Working late? Take care!')
    assert.equal(getGreetingForHour(0), 'Working late? Take care!')
    assert.equal(getGreetingForHour(2), 'Working late? Take care!')
    assert.equal(getGreetingForHour(4), 'Working late? Take care!')
  })

  it('correctly maps all 24 hours of the day without gaps', () => {
    for (let hour = 0; hour < 24; hour++) {
      const greeting = getGreetingForHour(hour)
      assert.ok(
        [
          'Good morning!',
          'Good afternoon!',
          'Good evening!',
          'Working late? Take care!',
        ].includes(greeting),
        `Unexpected greeting for hour ${hour}: ${greeting}`
      )
    }
  })

  it('derives greeting from Date object using Asia/Colombo timezone', () => {
    // 03:12 UTC is 08:42 in Asia/Colombo (UTC+5:30) -> Morning
    const morningDate = new Date('2026-11-17T03:12:00.000Z')
    assert.equal(getGreeting(morningDate), 'Good morning!')

    // 08:00 UTC is 13:30 in Asia/Colombo -> Afternoon
    const afternoonDate = new Date('2026-11-17T08:00:00.000Z')
    assert.equal(getGreeting(afternoonDate), 'Good afternoon!')

    // 12:30 UTC is 18:00 in Asia/Colombo -> Evening
    const eveningDate = new Date('2026-11-17T12:30:00.000Z')
    assert.equal(getGreeting(eveningDate), 'Good evening!')

    // 17:00 UTC is 22:30 in Asia/Colombo -> Late night
    const lateDate = new Date('2026-11-17T17:00:00.000Z')
    assert.equal(getGreeting(lateDate), 'Working late? Take care!')
  })
})

describe('Daily Motivational Agriculture Messages', () => {
  it('contains the 8 curated agriculture messages', () => {
    assert.equal(MOTIVATIONAL_MESSAGES.length, 8)
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Every small effort today creates a better harvest tomorrow.'
      )
    )
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Great harvests begin with consistent care.'
      )
    )
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Take care of your land, and it will reward you.'
      )
    )
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Small steps today. Better growth tomorrow.'
      )
    )
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Plan wisely, cultivate patiently, grow confidently.'
      )
    )
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Every season is an opportunity to grow.'
      )
    )
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Consistency today brings better results tomorrow.'
      )
    )
    assert.ok(
      MOTIVATIONAL_MESSAGES.includes(
        'Healthy soil, thoughtful care and patience create lasting growth.'
      )
    )
  })

  it('keeps the same message throughout the same calendar day in Asia/Colombo', () => {
    // 2026-11-17 across different hours of the same day in Asia/Colombo
    const morning = new Date('2026-11-17T05:30:00+05:30')
    const noon = new Date('2026-11-17T12:00:00+05:30')
    const night = new Date('2026-11-17T23:55:00+05:30')

    const msgMorning = getDailyMotivationalMessage(morning)
    const msgNoon = getDailyMotivationalMessage(noon)
    const msgNight = getDailyMotivationalMessage(night)

    assert.equal(msgMorning, msgNoon)
    assert.equal(msgNoon, msgNight)
  })

  it('rotates to a different message on consecutive calendar days', () => {
    const day1 = new Date('2026-11-17T10:00:00+05:30')
    const day2 = new Date('2026-11-18T10:00:00+05:30')
    const day3 = new Date('2026-11-19T10:00:00+05:30')

    const msg1 = getDailyMotivationalMessage(day1)
    const msg2 = getDailyMotivationalMessage(day2)
    const msg3 = getDailyMotivationalMessage(day3)

    assert.notEqual(msg1, msg2)
    assert.notEqual(msg2, msg3)
  })

  it('cycles across all 8 messages over 8 consecutive days', () => {
    const messages = new Set<string>()
    for (let i = 0; i < 8; i++) {
      const d = new Date(`2026-11-${17 + i}T12:00:00+05:30`)
      messages.add(getDailyMotivationalMessage(d))
    }
    assert.equal(messages.size, 8)
  })
})

describe('Current Date & Live Digital Clock (Asia/Colombo)', () => {
  it('formats full uppercase date matching "WEEKDAY, DD MONTH YYYY"', () => {
    const testDate = new Date('2026-11-17T08:42:00+05:30')
    const formattedDate = formatColomboDate(testDate)
    assert.equal(formattedDate, 'TUESDAY, 17 NOVEMBER 2026')
  })

  it('formats 12-hour digital clock with AM/PM', () => {
    // 08:42 in morning
    const morningDate = new Date('2026-11-17T08:42:00+05:30')
    assert.equal(formatColomboTime(morningDate), '08:42 AM')

    // 12:00 noon
    const noonDate = new Date('2026-11-17T12:00:00+05:30')
    assert.equal(formatColomboTime(noonDate), '12:00 PM')

    // 16:05 afternoon
    const afternoonDate = new Date('2026-11-17T16:05:00+05:30')
    assert.equal(formatColomboTime(afternoonDate), '04:05 PM')

    // 21:30 night
    const nightDate = new Date('2026-11-17T21:30:00+05:30')
    assert.equal(formatColomboTime(nightDate), '09:30 PM')

    // 00:05 midnight
    const midnightDate = new Date('2026-11-17T00:05:00+05:30')
    assert.equal(formatColomboTime(midnightDate), '12:05 AM')
  })

  it('calculates time in Asia/Colombo regardless of UTC input timestamp', () => {
    // 2026-11-17 03:12 UTC is exactly 08:42 AM in Asia/Colombo (UTC+5:30)
    const utcDate = new Date('2026-11-17T03:12:00.000Z')
    assert.equal(formatColomboTime(utcDate), '08:42 AM')
    assert.equal(formatColomboDate(utcDate), 'TUESDAY, 17 NOVEMBER 2026')
    assert.equal(getColomboHour(utcDate), 8)
  })
})
