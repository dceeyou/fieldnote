import { useEffect, useState } from 'react'
import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Sprout,
  Clock,
} from 'lucide-react'
import {
  MOTIVATIONAL_MESSAGES,
  getColomboHour,
  getGreetingForHour,
  getGreeting,
  getDailyMotivationalMessage,
  formatColomboDate,
  formatColomboTime,
} from '../../domain/greeting.ts'

export {
  MOTIVATIONAL_MESSAGES,
  getColomboHour,
  getGreetingForHour,
  getGreeting,
  getDailyMotivationalMessage,
  formatColomboDate,
  formatColomboTime,
}

export interface GreetingHeaderProps {
  className?: string
  /**
   * Optional custom date for testing or SSR preview.
   * Defaults to live real-time ticking date.
   */
  initialDate?: Date
}

export function GreetingHeader({ className = '', initialDate }: GreetingHeaderProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => initialDate || new Date())

  useEffect(() => {
    if (initialDate) return // Fixed date passed for tests

    // Efficient interval updating every 1000ms
    const interval = setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [initialDate])

  const hour = getColomboHour(currentDate)
  const greeting = getGreetingForHour(hour)
  const motivationalMessage = getDailyMotivationalMessage(currentDate)
  const dateFormatted = formatColomboDate(currentDate)
  const timeFormatted = formatColomboTime(currentDate)

  // Contextual icon based on current time period
  const GreetingIcon = () => {
    if (hour >= 5 && hour < 12) {
      return <Sunrise className="size-5 text-amber-300" aria-hidden="true" />
    }
    if (hour >= 12 && hour < 17) {
      return <Sun className="size-5 text-amber-400" aria-hidden="true" />
    }
    if (hour >= 17 && hour < 21) {
      return <Sunset className="size-5 text-orange-300" aria-hidden="true" />
    }
    return <Moon className="size-5 text-indigo-200" aria-hidden="true" />
  }

  return (
    <section
      aria-label="Dashboard Greeting & Sri Lanka Standard Time"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest-700 via-forest-600 to-forest-800 p-5 sm:p-6 lg:p-7 text-white shadow-md border border-forest-500/30 transition-colors ${className}`}
    >
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left / Primary Area: Greeting & Daily Motivational Quote */}
        <div className="space-y-2.5 max-w-xl">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-sm">
              <GreetingIcon />
            </div>
            <h2 className="text-2xl sm:text-[28px] font-semibold text-white tracking-tight leading-tight">
              {greeting}
            </h2>
          </div>

          <div className="flex items-start gap-2 pt-0.5 text-forest-100/95 text-sm leading-relaxed">
            <Sprout size={16} className="mt-0.5 shrink-0 text-forest-200 opacity-90" aria-hidden="true" />
            <p className="font-normal italic">
              &ldquo;{motivationalMessage}&rdquo;
            </p>
          </div>
        </div>

        {/* Right / Secondary Area: Prominent Date, Digital Clock & Sri Lanka Timezone */}
        <div className="rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col items-start sm:items-end justify-center shrink-0 min-w-[240px] sm:min-w-[270px]">
          {/* Current Date in Asia/Colombo (13-14px medium/semibold uppercase) */}
          <p className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-forest-200">
            {dateFormatted}
          </p>

          {/* Prominent Live Digital Clock (36-42px bold, tabular-nums) */}
          <div className="mt-1 flex items-center gap-2">
            <Clock size={20} className="text-forest-200 opacity-75 shrink-0" aria-hidden="true" />
            <span
              data-testid="live-digital-clock"
              className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-white tabular-nums leading-none drop-shadow-sm"
            >
              {timeFormatted}
            </span>
          </div>

          {/* Sri Lanka Timezone Subtitle (11-12px) */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] sm:text-xs text-forest-200/90 font-medium">
            <span
              className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse"
              aria-hidden="true"
            />
            <span>Sri Lanka Standard Time · Asia/Colombo</span>
          </div>
        </div>
      </div>
    </section>
  )
}
