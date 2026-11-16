import { z } from 'zod'

export interface WeatherLocation {
  name: string
  province?: string
  latitude: number
  longitude: number
}

// Pre-defined verified coordinates for key agricultural regions in Sri Lanka
export const SRI_LANKA_AGRICULTURAL_REGIONS: WeatherLocation[] = [
  { name: 'Kandy', province: 'Central Province', latitude: 7.2906, longitude: 80.6337 },
  { name: 'Kurunegala', province: 'North Western Province', latitude: 7.4863, longitude: 80.3623 },
  { name: 'Matale', province: 'Central Province', latitude: 7.4675, longitude: 80.6234 },
  { name: 'Nuwara Eliya', province: 'Central Highlands', latitude: 6.9497, longitude: 80.7891 },
  { name: 'Badulla', province: 'Uva Province', latitude: 6.9934, longitude: 81.055 },
  { name: 'Ratnapura', province: 'Sabaragamuwa Province', latitude: 6.6828, longitude: 80.3992 },
  { name: 'Galle', province: 'Southern Province', latitude: 6.0535, longitude: 80.221 },
  { name: 'Anuradhapura', province: 'North Central Province', latitude: 8.3114, longitude: 80.4037 },
  { name: 'Colombo', province: 'Western Province', latitude: 6.9271, longitude: 79.8612 },
  { name: 'Jaffna', province: 'Northern Province', latitude: 9.6615, longitude: 80.0255 },
]

export const DEFAULT_WEATHER_LOCATION = SRI_LANKA_AGRICULTURAL_REGIONS[0] // Kandy (Central Province)

// Zod schema for validating Open-Meteo response
export const openMeteoResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    apparent_temperature: z.number(),
    precipitation: z.number().optional().default(0),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    precipitation_probability_max: z.array(z.number().nullable()).optional(),
  }),
})

export type OpenMeteoResponse = z.infer<typeof openMeteoResponseSchema>

export interface WeatherDayForecast {
  date: string
  dayName: string
  condition: string
  weatherCode: number
  iconName: string
  tempMin: number
  tempMax: number
  rainProbability: number
}

export interface NormalizedWeatherData {
  location: WeatherLocation
  current: {
    temperature: number
    feelsLike: number
    humidity: number
    windSpeed: number
    rainProbability: number
    precipitation: number
    weatherCode: number
    condition: string
    iconName: string
    tempMaxToday: number
    tempMinToday: number
  }
  forecast: WeatherDayForecast[]
  lastUpdated: string
  isCached?: boolean
}
