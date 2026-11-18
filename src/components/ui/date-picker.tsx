import { useState, useEffect, useRef, useId, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from 'lucide-react'
import {
  getTodayColombo,
  formatDateDDMMYYYY,
} from '../../utils/date.ts'

export interface DatePickerProps {
  value?: string // ISO format: YYYY-MM-DD
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  minDate?: string // YYYY-MM-DD
  maxDate?: string // YYYY-MM-DD
  required?: boolean
  helperText?: string
  error?: string
  clearable?: boolean
  className?: string
  id?: string
  autoFocus?: boolean
}

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onChange: (range: DateRange) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  minDate?: string
  maxDate?: string
  required?: boolean
  helperText?: string
  error?: string
  clearable?: boolean
  className?: string
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

interface CalendarCell {
  date: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isDisabled: boolean
  isInRange?: boolean
  isRangeStart?: boolean
  isRangeEnd?: boolean
}

/**
 * Generates Monday-first calendar days for a given year and month (1-12).
 */
function getCalendarDays(
  year: number,
  month: number,
  selectedDate?: string,
  minDate?: string,
  maxDate?: string,
  rangeStart?: string,
  rangeEnd?: string
): CalendarCell[] {
  const today = getTodayColombo()
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const startDayIndex = (firstDay.getUTCDay() + 6) % 7 // 0 = Monday, 6 = Sunday
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const prevMonthTotalDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()

  const cells: CalendarCell[] = []

  // 1. Leading days from previous month
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const day = prevMonthTotalDays - i
    const prevM = month === 1 ? 12 : month - 1
    const prevY = month === 1 ? year - 1 : year
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const isDisabled = Boolean(
      (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
    )

    cells.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === today,
      isSelected: dateStr === selectedDate,
      isDisabled,
      isInRange: Boolean(
        rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd
      ),
      isRangeStart: dateStr === rangeStart,
      isRangeEnd: dateStr === rangeEnd,
    })
  }

  // 2. Days of current month
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isDisabled = Boolean(
      (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
    )

    cells.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === today,
      isSelected: dateStr === selectedDate,
      isDisabled,
      isInRange: Boolean(
        rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd
      ),
      isRangeStart: dateStr === rangeStart,
      isRangeEnd: dateStr === rangeEnd,
    })
  }

  // 3. Trailing days to fill 5 or 6 complete weeks (multiple of 7)
  let nextDay = 1
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const nextM = month === 12 ? 1 : month + 1
    const nextY = month === 12 ? year + 1 : year
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
    const isDisabled = Boolean(
      (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
    )

    cells.push({
      date: dateStr,
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: dateStr === today,
      isSelected: dateStr === selectedDate,
      isDisabled,
      isInRange: Boolean(
        rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd
      ),
      isRangeStart: dateStr === rangeStart,
      isRangeEnd: dateStr === rangeEnd,
    })
    nextDay++
  }

  return cells
}

/**
 * Modern Single Date Picker Component
 * Replaces native HTML date input with modern SaaS Calendar Popover.
 */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  minDate,
  maxDate,
  required = false,
  helperText,
  error,
  clearable = true,
  className = '',
  id,
  autoFocus = false,
}: DatePickerProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const containerRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(false)

  // Current view month and year
  const initialYear = value ? Number(value.slice(0, 4)) : Number(getTodayColombo().slice(0, 4))
  const initialMonth = value ? Number(value.slice(5, 7)) : Number(getTodayColombo().slice(5, 7))

  const [viewYear, setViewYear] = useState(initialYear)
  const [viewMonth, setViewMonth] = useState(initialMonth)

  // When value changes externally, align view if valid
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setViewYear(Number(value.slice(0, 4)))
      setViewMonth(Number(value.slice(5, 7)))
    }
  }, [value])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Escape key to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    },
    []
  )

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  function handleSelectDate(dateStr: string) {
    onChange(dateStr)
    setIsOpen(false)
  }

  function handleSelectToday() {
    const today = getTodayColombo()
    setViewYear(Number(today.slice(0, 4)))
    setViewMonth(Number(today.slice(5, 7)))
    onChange(today)
    setIsOpen(false)
  }

  function handleClear(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  const cells = getCalendarDays(viewYear, viewMonth, value, minDate, maxDate)

  // Generate Year options (current - 15 to current + 15)
  const currentYearNum = Number(getTodayColombo().slice(0, 4))
  const yearOptions: number[] = []
  for (let y = currentYearNum - 15; y <= currentYearNum + 15; y++) {
    yearOptions.push(y)
  }

  const formattedDisplay = value ? formatDateDDMMYYYY(value) : ''

  return (
    <div
      ref={containerRef}
      className={`relative space-y-1.5 ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-text"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Input Trigger Button */}
      <div className="relative">
        <button
          id={inputId}
          type="button"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen)
          }}
          className={`flex h-9 w-full items-center justify-between rounded-lg border bg-surface px-3 py-2 text-left text-sm transition-colors ${
            error
              ? 'border-red-500 ring-1 ring-red-500'
              : 'border-border hover:border-forest-500 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500'
          } ${disabled ? 'cursor-not-allowed bg-subtle text-muted opacity-60' : 'text-text cursor-pointer'}`}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon size={15} className="shrink-0 text-muted" />
            <span className={value ? 'font-medium text-text' : 'text-muted'}>
              {formattedDisplay || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear date"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClear()
                }}
                className="rounded p-0.5 text-muted hover:bg-subtle hover:text-text transition-colors"
              >
                <X size={14} />
              </span>
            )}
          </div>
        </button>
      </div>

      {helperText && !error && (
        <p className="text-[11px] text-muted">{helperText}</p>
      )}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}

      {/* Popover Calendar */}
      {isOpen && !disabled && (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute left-0 top-full mt-1.5 z-50 w-[285px] rounded-xl border border-border bg-surface p-3 shadow-xl ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Calendar Header with Selectors */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-border">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-text transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              {/* Direct Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                aria-label="Select month"
                className="h-7 rounded-md border border-border bg-surface px-1 text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-forest-500 cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Direct Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                aria-label="Select year"
                className="h-7 rounded-md border border-border bg-surface px-1 text-xs font-semibold text-text focus:outline-none focus:ring-1 focus:ring-forest-500 cursor-pointer"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-text transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Column Headers (Monday First) */}
          <div
            className="grid grid-cols-7 pt-2 text-center text-[11px] font-semibold text-muted"
            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
          >
            {DAY_NAMES.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div
            className="grid grid-cols-7 gap-y-1 pt-1"
            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
          >
            {cells.map((cell) => {
              let cellClasses =
                'grid size-8 place-items-center rounded-lg text-xs font-medium transition-colors '

              if (cell.isDisabled) {
                cellClasses += 'text-muted/40 cursor-not-allowed '
              } else if (cell.isSelected) {
                // Forest green selection (#356B45)
                cellClasses +=
                  'bg-forest-600 text-white font-semibold shadow-sm hover:bg-forest-700 '
              } else if (cell.isToday) {
                cellClasses +=
                  'ring-1 ring-forest-500 font-semibold text-forest-700 dark:text-forest-300 hover:bg-subtle '
              } else if (!cell.isCurrentMonth) {
                cellClasses += 'text-muted/50 hover:bg-subtle hover:text-text '
              } else {
                cellClasses += 'text-text hover:bg-subtle '
              }

              return (
                <div key={cell.date} className="flex justify-center">
                  <button
                    type="button"
                    disabled={cell.isDisabled}
                    onClick={() => handleSelectDate(cell.date)}
                    className={cellClasses}
                  >
                    {cell.dayNumber}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-forest-700 hover:bg-forest-50 dark:text-forest-300 dark:hover:bg-forest-900/30 transition-colors"
            >
              <RotateCcw size={12} /> Today
            </button>

            {clearable && value && !required && (
              <button
                type="button"
                onClick={() => handleClear()}
                className="rounded-md px-2 py-1 font-medium text-muted hover:bg-subtle hover:text-text transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Modern Custom Date Range Picker Component
 * Supports selecting start date, end date, visual range highlight, and clearing.
 */
export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label,
  placeholder = 'Select date range',
  disabled = false,
  minDate,
  maxDate,
  required = false,
  helperText,
  error,
  clearable = true,
  className = '',
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Calendar view month & year
  const anchorDate = startDate || getTodayColombo()
  const [viewYear, setViewYear] = useState(Number(anchorDate.slice(0, 4)))
  const [viewMonth, setViewMonth] = useState(Number(anchorDate.slice(5, 7)))

  // Selection state while picking
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  function handleDateClick(dateStr: string) {
    if (!startDate || (startDate && endDate)) {
      // Begin new range
      onChange({ startDate: dateStr, endDate: '' })
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        // Clicked date is earlier than start: swap or set as start
        onChange({ startDate: dateStr, endDate: '' })
      } else {
        // Complete range
        onChange({ startDate, endDate: dateStr })
        setIsOpen(false)
      }
    }
  }

  function handleClear(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    onChange({ startDate: '', endDate: '' })
    setIsOpen(false)
  }

  const effectiveEnd = endDate || hoverDate || ''
  const cells = getCalendarDays(
    viewYear,
    viewMonth,
    undefined,
    minDate,
    maxDate,
    startDate,
    effectiveEnd
  )

  const currentYearNum = Number(getTodayColombo().slice(0, 4))
  const yearOptions: number[] = []
  for (let y = currentYearNum - 10; y <= currentYearNum + 10; y++) {
    yearOptions.push(y)
  }

  const rangeDisplay =
    startDate && endDate
      ? `${formatDateDDMMYYYY(startDate)} – ${formatDateDDMMYYYY(endDate)}`
      : startDate
      ? `From ${formatDateDDMMYYYY(startDate)}`
      : ''

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-text">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {/* Range Input Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen)
        }}
        className={`flex h-9 w-full items-center justify-between rounded-lg border bg-surface px-3 py-2 text-left text-sm transition-colors ${
          error
            ? 'border-red-500 ring-1 ring-red-500'
            : 'border-border hover:border-forest-500 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500'
        } ${disabled ? 'cursor-not-allowed bg-subtle text-muted opacity-60' : 'text-text cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon size={15} className="shrink-0 text-muted" />
          <span className={rangeDisplay ? 'font-medium text-text' : 'text-muted'}>
            {rangeDisplay || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {clearable && (startDate || endDate) && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date range"
              onClick={handleClear}
              className="rounded p-0.5 text-muted hover:bg-subtle hover:text-text transition-colors"
            >
              <X size={14} />
            </span>
          )}
        </div>
      </button>

      {helperText && !error && (
        <p className="text-[11px] text-muted">{helperText}</p>
      )}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}

      {/* Popover Calendar for Range */}
      {isOpen && !disabled && (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute left-0 top-full mt-1.5 z-50 w-[300px] rounded-xl border border-border bg-surface p-3.5 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <button
              type="button"
              onClick={prevMonth}
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-text"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-7 rounded-md border border-border bg-surface px-1 text-xs font-semibold text-text"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-7 rounded-md border border-border bg-surface px-1 text-xs font-semibold text-text"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-text"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div
            className="grid grid-cols-7 pt-2 text-center text-[11px] font-semibold text-muted"
            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
          >
            {DAY_NAMES.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid with Range Highlight */}
          <div
            className="grid grid-cols-7 pt-1"
            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
          >
            {cells.map((cell) => {
              const isStart = cell.date === startDate
              const isEnd = cell.date === endDate
              const inRange = Boolean(
                startDate &&
                  endDate &&
                  cell.date > startDate &&
                  cell.date < endDate
              )

              let wrapperClasses = 'py-0.5 '
              if (inRange) {
                wrapperClasses += 'bg-forest-50 dark:bg-forest-900/30 '
              } else if (isStart && endDate) {
                wrapperClasses += 'bg-forest-50 dark:bg-forest-900/30 rounded-l-lg '
              } else if (isEnd && startDate) {
                wrapperClasses += 'bg-forest-50 dark:bg-forest-900/30 rounded-r-lg '
              }

              let btnClasses =
                'grid size-8 place-items-center rounded-lg text-xs font-medium transition-colors mx-auto '

              if (cell.isDisabled) {
                btnClasses += 'text-muted/40 cursor-not-allowed '
              } else if (isStart || isEnd) {
                btnClasses += 'bg-forest-600 text-white font-semibold '
              } else if (inRange) {
                btnClasses += 'text-forest-900 dark:text-forest-100 font-medium '
              } else if (cell.isToday) {
                btnClasses +=
                  'ring-1 ring-forest-500 font-semibold text-forest-700 dark:text-forest-300 hover:bg-subtle '
              } else if (!cell.isCurrentMonth) {
                btnClasses += 'text-muted/50 hover:bg-subtle '
              } else {
                btnClasses += 'text-text hover:bg-subtle '
              }

              return (
                <div key={cell.date} className={wrapperClasses}>
                  <button
                    type="button"
                    disabled={cell.isDisabled}
                    onClick={() => handleDateClick(cell.date)}
                    onMouseEnter={() => {
                      if (startDate && !endDate) setHoverDate(cell.date)
                    }}
                    className={btnClasses}
                  >
                    {cell.dayNumber}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Range Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
            <span className="text-muted">
              {startDate && !endDate ? 'Select end date' : ''}
            </span>
            <div className="flex items-center gap-2">
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="rounded px-2 py-1 text-muted hover:text-text hover:bg-subtle"
                >
                  Clear Range
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
