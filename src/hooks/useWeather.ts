import { useState, useEffect, useCallback } from 'react'
import type { WeatherLocation, NormalizedWeatherData } from '../domain/weather.ts'
import {
  fetchWeatherData,
  getSavedWeatherLocation,
  saveWeatherLocation,
} from '../services/weatherService.ts'

export function useWeather(initialLocation?: WeatherLocation) {
  const [currentLocation, setCurrentLocation] = useState<WeatherLocation>(() => {
    return initialLocation || getSavedWeatherLocation()
  })
  const [data, setData] = useState<NormalizedWeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false
  })

  // Track online/offline status
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
    }
    function handleOffline() {
      setIsOffline(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadWeather = useCallback(async (loc: WeatherLocation, force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWeatherData(loc, force)
      setData(res)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load weather forecast.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWeather(currentLocation, false)
  }, [currentLocation, loadWeather])

  const setLocation = useCallback(
    (newLoc: WeatherLocation, savePreference = true) => {
      setCurrentLocation(newLoc)
      if (savePreference) {
        saveWeatherLocation(newLoc)
      }
      loadWeather(newLoc, false)
    },
    [loadWeather]
  )

  const refresh = useCallback(() => {
    return loadWeather(currentLocation, true)
  }, [currentLocation, loadWeather])

  return {
    data,
    loading,
    error,
    isOffline,
    currentLocation,
    setLocation,
    refresh,
  }
}
