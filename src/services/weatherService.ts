import {
  openMeteoResponseSchema,
  type WeatherLocation,
  type NormalizedWeatherData,
  type WeatherDayForecast,
  DEFAULT_WEATHER_LOCATION,
} from '../domain/weather.ts'

const CACHE_TTL_MS = 45 * 60 * 1000 // 45 minutes
const LOCATION_STORAGE_KEY = 'fieldnote_weather_primary_location'

/**
 * Interpret WMO Weather Interpretation Codes into human condition & Lucide icon name.
 * Reference: Open-Meteo & WMO Code Table 4677
 */
export function interpretWeatherCode(code: number): { condition: string; iconName: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', iconName: 'Sun' }
    case 1:
      return { condition: 'Mainly Clear', iconName: 'SunMedium' }
    case 2:
      return { condition: 'Partly Cloudy', iconName: 'CloudSun' }
    case 3:
      return { condition: 'Overcast', iconName: 'Cloud' }
    case 45:
    case 48:
      return { condition: 'Fog & Mist', iconName: 'CloudFog' }
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', iconName: 'CloudDrizzle' }
    case 56:
    case 57:
      return { condition: 'Freezing Drizzle', iconName: 'CloudDrizzle' }
    case 61:
      return { condition: 'Slight Rain', iconName: 'CloudRain' }
    case 63:
      return { condition: 'Moderate Rain', iconName: 'CloudRain' }
    case 65:
      return { condition: 'Heavy Rain', iconName: 'CloudRain' }
    case 66:
    case 67:
      return { condition: 'Freezing Rain', iconName: 'CloudRain' }
    case 71:
    case 73:
    case 75:
      return { condition: 'Snow Fall', iconName: 'CloudSnow' }
    case 77:
      return { condition: 'Snow Grains', iconName: 'CloudSnow' }
    case 80:
      return { condition: 'Light Rain Showers', iconName: 'CloudSunRain' }
    case 81:
      return { condition: 'Moderate Showers', iconName: 'CloudRain' }
    case 82:
      return { condition: 'Heavy Showers', iconName: 'CloudRain' }
    case 85:
    case 86:
      return { condition: 'Snow Showers', iconName: 'CloudSnow' }
    case 95:
      return { condition: 'Thunderstorm', iconName: 'CloudLightning' }
    case 96:
    case 99:
      return { condition: 'Thunderstorm with Hail', iconName: 'CloudLightning' }
    default:
      return { condition: 'Fair Weather', iconName: 'Sun' }
  }
}

/**
 * Get the user's saved primary weather location, or fallback to default.
 */
export function getSavedWeatherLocation(): WeatherLocation {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WeatherLocation
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' && parsed.name) {
        return parsed
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_WEATHER_LOCATION
}

/**
 * Save user's primary weather location preference.
 */
export function saveWeatherLocation(location: WeatherLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
  } catch {
    // ignore
  }
}

function getCacheKey(lat: number, lon: number): string {
  return `fieldnote_weather_cache_${lat.toFixed(3)}_${lon.toFixed(3)}`
}

/**
 * Fetch and normalize weather data from Open-Meteo with caching.
 */
export async function fetchWeatherData(
  location: WeatherLocation,
  forceRefresh = false
): Promise<NormalizedWeatherData> {
  const cacheKey = getCacheKey(location.latitude, location.longitude)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  // 1. Check cache first
  try {
    const cachedRaw = localStorage.getItem(cacheKey)
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as { timestamp: number; data: NormalizedWeatherData }
      const age = Date.now() - parsed.timestamp
      if (!forceRefresh && (age < CACHE_TTL_MS || !isOnline)) {
        return {
          ...parsed.data,
          location, // ensure current name
          isCached: true,
        }
      }
    }
  } catch {
    // Cache read failure, proceed to fetch
  }

  if (!isOnline) {
    throw new Error('You are currently offline. Cached weather data is not available for this location.')
  }

  // 2. Fetch from Open-Meteo API
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', location.latitude.toString())
  url.searchParams.set('longitude', location.longitude.toString())
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m'
  )
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  )
  url.searchParams.set('timezone', 'Asia/Colombo')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Open-Meteo weather service error (${response.status}: ${response.statusText})`)
  }

  const json = await response.json()
  const validated = openMeteoResponseSchema.parse(json)

  // 3. Normalize Current Weather
  const currentInterp = interpretWeatherCode(validated.current.weather_code)
  const todayMax = validated.daily.temperature_2m_max[0] ?? validated.current.temperature_2m
  const todayMin = validated.daily.temperature_2m_min[0] ?? validated.current.temperature_2m
  const todayRainProb = validated.daily.precipitation_probability_max?.[0] ?? 0

  // 4. Normalize 5-Day Forecast
  const forecast: WeatherDayForecast[] = []
  const daysCount = Math.min(5, validated.daily.time.length)

  for (let i = 0; i < daysCount; i++) {
    const dateStr = validated.daily.time[i]
    const code = validated.daily.weather_code[i]
    const interp = interpretWeatherCode(code)
    const [y, m, d] = dateStr.split('-').map(Number)
    const dateObj = new Date(Date.UTC(y, m - 1, d))
    const dayName =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dateObj)

    forecast.push({
      date: dateStr,
      dayName,
      condition: interp.condition,
      weatherCode: code,
      iconName: interp.iconName,
      tempMin: Math.round(validated.daily.temperature_2m_min[i] ?? 0),
      tempMax: Math.round(validated.daily.temperature_2m_max[i] ?? 0),
      rainProbability: validated.daily.precipitation_probability_max?.[i] ?? 0,
    })
  }

  const nowColombo = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Colombo',
  }).format(new Date())

  const normalized: NormalizedWeatherData = {
    location,
    current: {
      temperature: Math.round(validated.current.temperature_2m * 10) / 10,
      feelsLike: Math.round(validated.current.apparent_temperature * 10) / 10,
      humidity: Math.round(validated.current.relative_humidity_2m),
      windSpeed: Math.round(validated.current.wind_speed_10m * 10) / 10,
      rainProbability: todayRainProb,
      precipitation: validated.current.precipitation ?? 0,
      weatherCode: validated.current.weather_code,
      condition: currentInterp.condition,
      iconName: currentInterp.iconName,
      tempMaxToday: Math.round(todayMax),
      tempMinToday: Math.round(todayMin),
    },
    forecast,
    lastUpdated: nowColombo,
    isCached: false,
  }

  // 5. Store in localStorage cache
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        data: normalized,
      })
    )
  } catch {
    // quota exceeded or storage disabled
  }

  return normalized
}
