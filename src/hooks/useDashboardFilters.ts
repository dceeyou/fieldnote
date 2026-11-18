import { useState, useCallback, useMemo } from 'react'
import type { DashboardFilters, DatePreset } from '../domain/dashboard.ts'
import { getTodayColombo, getCurrentMonthColombo } from '../utils/date.ts'

export function computeDatesForPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const today = getTodayColombo()
  const [yearStr, monthStr, dayStr] = today.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  switch (preset) {
    case 'this_month': {
      const start = `${getCurrentMonthColombo()}-01`
      return { startDate: start, endDate: today }
    }
    case 'last_3_months': {
      // 3 calendar months back
      const d = new Date(Date.UTC(year, month - 1 - 3, Number(dayStr)))
      const start = d.toISOString().slice(0, 10)
      return { startDate: start, endDate: today }
    }
    case 'last_6_months': {
      // 6 calendar months back
      const d = new Date(Date.UTC(year, month - 1 - 6, Number(dayStr)))
      const start = d.toISOString().slice(0, 10)
      return { startDate: start, endDate: today }
    }
    case 'this_year': {
      return { startDate: `${year}-01-01`, endDate: today }
    }
    case 'all_time': {
      return { startDate: '', endDate: '' }
    }
    case 'custom':
    default: {
      return { startDate: `${getCurrentMonthColombo()}-01`, endDate: today }
    }
  }
}

export const SESSION_DATE_PRESET_KEY = 'agriflow_session_date_preset'

export function getSessionDatePreset(fallback: DatePreset = 'all_time'): DatePreset {
  if (typeof window === 'undefined' || !window.sessionStorage) return fallback
  try {
    const saved = window.sessionStorage.getItem(SESSION_DATE_PRESET_KEY)
    if (saved === 'all') return 'all_time'
    if (
      saved &&
      ['all_time', 'this_month', 'last_3_months', 'last_6_months', 'this_year', 'custom'].includes(saved)
    ) {
      return saved as DatePreset
    }
  } catch {
    // Non-fatal session storage access fallback
  }
  return fallback
}

export function setSessionDatePreset(preset: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  try {
    const normalized = preset === 'all' ? 'all_time' : preset
    window.sessionStorage.setItem(SESSION_DATE_PRESET_KEY, normalized)
  } catch {
    // Non-fatal session storage access fallback
  }
}

export function useDashboardFilters(initialPreset?: DatePreset) {
  const resolvedPreset = initialPreset ?? getSessionDatePreset('all_time')
  const initialDates = useMemo(() => computeDatesForPreset(resolvedPreset), [resolvedPreset])

  const [datePreset, setDatePresetState] = useState<DatePreset>(resolvedPreset)
  const [startDate, setStartDate] = useState(initialDates.startDate)
  const [endDate, setEndDate] = useState(initialDates.endDate)
  const [landId, setLandId] = useState<string>('all')
  const [cropId, setCropId] = useState<string>('all')

  const setDatePreset = useCallback((newPreset: DatePreset) => {
    setDatePresetState(newPreset)
    setSessionDatePreset(newPreset)
    if (newPreset !== 'custom') {
      const dates = computeDatesForPreset(newPreset)
      setStartDate(dates.startDate)
      setEndDate(dates.endDate)
    }
  }, [])

  const setCustomDates = useCallback((start: string, end: string) => {
    setDatePresetState('custom')
    setSessionDatePreset('custom')
    setStartDate(start)
    setEndDate(end)
  }, [])

  const resetFilters = useCallback(() => {
    const dates = computeDatesForPreset('all_time')
    setDatePresetState('all_time')
    setSessionDatePreset('all_time')
    setStartDate(dates.startDate)
    setEndDate(dates.endDate)
    setLandId('all')
    setCropId('all')
  }, [])

  const filters: DashboardFilters = useMemo(
    () => ({
      datePreset,
      startDate,
      endDate,
      landId,
      cropId,
    }),
    [datePreset, startDate, endDate, landId, cropId]
  )

  return {
    filters,
    datePreset,
    startDate,
    endDate,
    landId,
    cropId,
    setDatePreset,
    setCustomDates,
    setStartDate: (s: string) => {
      setDatePresetState('custom')
      setStartDate(s)
    },
    setEndDate: (e: string) => {
      setDatePresetState('custom')
      setEndDate(e)
    },
    setLandId,
    setCropId,
    resetFilters,
  }
}
