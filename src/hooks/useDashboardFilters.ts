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

export function useDashboardFilters(initialPreset: DatePreset = 'this_month') {
  const initialDates = useMemo(() => computeDatesForPreset(initialPreset), [initialPreset])

  const [datePreset, setDatePresetState] = useState<DatePreset>(initialPreset)
  const [startDate, setStartDate] = useState(initialDates.startDate)
  const [endDate, setEndDate] = useState(initialDates.endDate)
  const [landId, setLandId] = useState<string>('all')
  const [cropId, setCropId] = useState<string>('all')

  const setDatePreset = useCallback((newPreset: DatePreset) => {
    setDatePresetState(newPreset)
    if (newPreset !== 'custom') {
      const dates = computeDatesForPreset(newPreset)
      setStartDate(dates.startDate)
      setEndDate(dates.endDate)
    }
  }, [])

  const setCustomDates = useCallback((start: string, end: string) => {
    setDatePresetState('custom')
    setStartDate(start)
    setEndDate(end)
  }, [])

  const resetFilters = useCallback(() => {
    const dates = computeDatesForPreset('this_month')
    setDatePresetState('this_month')
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
