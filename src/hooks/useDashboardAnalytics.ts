import { useState, useEffect, useCallback, useMemo } from 'react'
import type { DashboardFilters, DashboardAnalyticsData } from '../domain/dashboard.ts'
import type {
  Transaction,
  FertilizerApplication,
  Land,
  Crop,
  Category,
  Fertilizer,
} from '../data/db/schema.ts'
import { getTransactions } from '../services/transactionService.ts'
import {
  getFertilizerApplications,
  markApplicationCompleted,
} from '../services/fertilizerApplicationService.ts'
import { getAllLands } from '../services/landService.ts'
import { getAllCrops } from '../services/cropService.ts'
import { getAllCategories } from '../services/categoryService.ts'
import { getAllFertilizers } from '../services/fertilizerService.ts'
import { computeDashboardAnalytics } from '../services/dashboardService.ts'
import { getTodayColombo } from '../utils/date.ts'

export function useDashboardAnalytics(filters: DashboardFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [applications, setApplications] = useState<FertilizerApplication[]>([])
  const [lands, setLands] = useState<Land[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [allTx, allApps, allLands, allCrops, allCats, allFerts] = await Promise.all([
        getTransactions(),
        getFertilizerApplications(),
        getAllLands(true),
        getAllCrops(true),
        getAllCategories(true),
        getAllFertilizers(true),
      ])

      setTransactions(allTx)
      setApplications(allApps)
      setLands(allLands)
      setCrops(allCrops)
      setCategories(allCats)
      setFertilizers(allFerts)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load dashboard data.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleSyncComplete = () => {
      loadData()
    }
    window.addEventListener('agriflow:sync-complete', handleSyncComplete)
    return () => {
      window.removeEventListener('agriflow:sync-complete', handleSyncComplete)
    }
  }, [loadData])

  const analytics: DashboardAnalyticsData = useMemo(() => {
    return computeDashboardAnalytics(
      transactions,
      applications,
      lands,
      crops,
      categories,
      fertilizers,
      filters
    )
  }, [transactions, applications, lands, crops, categories, fertilizers, filters])

  const quickCompleteFertilizer = useCallback(
    async (appId: string) => {
      const today = getTodayColombo()
      await markApplicationCompleted(appId, today)
      await loadData()
    },
    [loadData]
  )

  return {
    analytics,
    loading,
    error,
    refresh: loadData,
    quickCompleteFertilizer,
  }
}
