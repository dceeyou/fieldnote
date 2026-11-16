import { useState } from 'react'
import {
  Sun,
  SunMedium,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudSunRain,
  Wind,
  Droplets,
  Thermometer,
  CloudRainWind,
  RefreshCw,
  MapPin,
  ExternalLink,
  WifiOff,
  ChevronDown,
  Check,
} from 'lucide-react'
import { Card } from '../ui/Card.tsx'
import { Button } from '../ui/Button.tsx'
import { Input } from '../ui/Input.tsx'
import { Modal } from '../ui/Modal.tsx'
import { useWeather } from '../../hooks/useWeather.ts'
import {
  SRI_LANKA_AGRICULTURAL_REGIONS,
  type WeatherLocation,
} from '../../domain/weather.ts'
import type { Land } from '../../data/db/schema.ts'

interface WeatherWidgetProps {
  lands?: Land[]
  activeLandId?: string
}

function WeatherIcon({ name, className = 'size-6' }: { name: string; className?: string }) {
  switch (name) {
    case 'Sun':
      return <Sun className={className} />
    case 'SunMedium':
      return <SunMedium className={className} />
    case 'CloudSun':
      return <CloudSun className={className} />
    case 'Cloud':
      return <Cloud className={className} />
    case 'CloudFog':
      return <CloudFog className={className} />
    case 'CloudDrizzle':
      return <CloudDrizzle className={className} />
    case 'CloudRain':
      return <CloudRain className={className} />
    case 'CloudSnow':
      return <CloudSnow className={className} />
    case 'CloudLightning':
      return <CloudLightning className={className} />
    case 'CloudSunRain':
      return <CloudSunRain className={className} />
    default:
      return <Sun className={className} />
  }
}

export function WeatherWidget({ lands = [] }: WeatherWidgetProps) {
  const { data, loading, error, isOffline, currentLocation, setLocation, refresh } = useWeather()
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customLat, setCustomLat] = useState('')
  const [customLon, setCustomLon] = useState('')
  const [customError, setCustomError] = useState<string | null>(null)

  function handleSelectPreset(loc: WeatherLocation) {
    setLocation(loc, true)
    setIsLocationModalOpen(false)
  }

  function handleApplyCustom(e: React.FormEvent) {
    e.preventDefault()
    setCustomError(null)
    const lat = parseFloat(customLat)
    const lon = parseFloat(customLon)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setCustomError('Latitude must be a valid number between -90 and 90.')
      return
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setCustomError('Longitude must be a valid number between -180 and 180.')
      return
    }
    const loc: WeatherLocation = {
      name: customName.trim() || `Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      province: 'Manual Coordinates',
      latitude: lat,
      longitude: lon,
    }
    setLocation(loc, true)
    setIsLocationModalOpen(false)
    setCustomName('')
    setCustomLat('')
    setCustomLon('')
  }

  return (
    <Card className="overflow-hidden border-border bg-surface p-5 sm:p-6 transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-900/30 dark:text-forest-200">
            <Sun className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text">Agricultural Weather Forecast</h2>
              {isOffline && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <WifiOff size={11} /> Offline
                </span>
              )}
              {data?.isCached && !isOffline && (
                <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-muted">
                  Cached
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Live meteorological indicators & 5-day agro-climate outlook (Asia/Colombo)
            </p>
          </div>
        </div>

        {/* Location selector button & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-subtle px-2.5 py-1.5 text-xs font-medium text-text hover:bg-border transition-colors"
            title="Change farm weather location"
          >
            <MapPin size={13} className="text-forest-600" />
            <span className="max-w-[140px] truncate">{currentLocation.name}</span>
            <ChevronDown size={13} className="text-muted" />
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh weather"
            title={data ? `Last updated: ${data.lastUpdated}` : 'Refresh'}
            className="size-8"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-forest-600' : 'text-muted'} />
          </Button>
        </div>
      </div>

      {/* Main Body */}
      {loading && !data ? (
        <div className="py-10 text-center text-xs text-muted animate-pulse">
          Loading meteorological observations for {currentLocation.name}...
        </div>
      ) : error && !data ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <p className="font-semibold">Unable to load weather forecast</p>
          <p className="mt-1">{error}</p>
          <div className="mt-3">
            <Button size="default" variant="secondary" className="h-7 text-xs" onClick={refresh}>
              Retry Connection
            </Button>
          </div>
        </div>
      ) : data ? (
        <div className="mt-5 space-y-6">
          {/* Current Weather Overview Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Primary Current Temp & Condition */}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-canvas p-4 sm:col-span-2 lg:col-span-1">
              <div className="grid size-14 place-items-center rounded-xl bg-forest-50 text-forest-600 dark:bg-forest-900/40 dark:text-forest-200">
                <WeatherIcon name={data.current.iconName} className="size-8" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-text">
                    {data.current.temperature}°C
                  </span>
                  <span className="text-xs text-muted">
                    H: {data.current.tempMaxToday}° / L: {data.current.tempMinToday}°
                  </span>
                </div>
                <p className="text-xs font-medium text-text mt-0.5">{data.current.condition}</p>
                <p className="text-[11px] text-muted">
                  Feels like {data.current.feelsLike}°C
                </p>
              </div>
            </div>

            {/* Humidity */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-canvas p-4">
              <div className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                <Droplets size={20} />
              </div>
              <div>
                <span className="text-xs text-muted">Relative Humidity</span>
                <p className="text-lg font-semibold text-text">{data.current.humidity}%</p>
                <span className="text-[11px] text-muted">
                  {data.current.humidity > 80 ? 'High (Fungal risk)' : 'Optimal range'}
                </span>
              </div>
            </div>

            {/* Rain Probability / Precipitation */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-canvas p-4">
              <div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <CloudRainWind size={20} />
              </div>
              <div>
                <span className="text-xs text-muted">Rain Probability</span>
                <p className="text-lg font-semibold text-text">{data.current.rainProbability}%</p>
                <span className="text-[11px] text-muted">
                  {data.current.precipitation > 0 ? `${data.current.precipitation} mm today` : 'No precipitation'}
                </span>
              </div>
            </div>

            {/* Wind Speed */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-canvas p-4">
              <div className="grid size-10 place-items-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
                <Wind size={20} />
              </div>
              <div>
                <span className="text-xs text-muted">Wind Speed</span>
                <p className="text-lg font-semibold text-text">{data.current.windSpeed} km/h</p>
                <span className="text-[11px] text-muted">
                  {data.current.windSpeed > 20 ? 'Breezy (Avoid spraying)' : 'Safe for spraying'}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Day Agro-Climate Forecast Strip */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                5-Day Agro-Climate Forecast
              </span>
              <span className="text-[11px] text-muted">
                Updated at {data.lastUpdated}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {data.forecast.map((day) => (
                <div
                  key={day.date}
                  className="flex flex-col items-center justify-between rounded-xl border border-border bg-canvas p-3 text-center transition-colors hover:border-forest-600/40"
                >
                  <span className="text-xs font-medium text-text">{day.dayName}</span>
                  <div className="my-2 text-forest-600 dark:text-forest-200">
                    <WeatherIcon name={day.iconName} className="size-6" />
                  </div>
                  <span className="text-[11px] text-muted line-clamp-1">{day.condition}</span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-text">
                    <span>{day.tempMax}°</span>
                    <span className="text-muted font-normal text-[11px]">/ {day.tempMin}°</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                    <Droplets size={10} />
                    <span>{day.rainProbability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open-Meteo Attribution Link */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted">
            <div className="flex items-center gap-1">
              <Thermometer size={12} className="text-muted" />
              <span>Location: {currentLocation.name} ({currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)})</span>
            </div>
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-forest-600 hover:text-forest-700 hover:underline dark:text-forest-400"
            >
              Weather data by Open-Meteo.com
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      ) : null}

      {/* Location Selection Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Select Farm Weather Location"
        description="Configure your primary weather location. Weather data is fetched for the exact coordinates."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text block mb-2">
              Sri Lankan Agricultural Regions (Presets)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {SRI_LANKA_AGRICULTURAL_REGIONS.map((region) => {
                const isSelected =
                  Math.abs(region.latitude - currentLocation.latitude) < 0.001 &&
                  Math.abs(region.longitude - currentLocation.longitude) < 0.001

                return (
                  <button
                    key={region.name}
                    type="button"
                    onClick={() => handleSelectPreset(region)}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-forest-600 bg-forest-50 font-semibold text-forest-800 dark:border-forest-500 dark:bg-forest-950/40 dark:text-forest-200'
                        : 'border-border bg-surface hover:bg-subtle text-text'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{region.name}</p>
                      <p className="text-[10px] text-muted">{region.province}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-forest-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cultivation Lands list if any have location info */}
          {lands.length > 0 && (
            <div className="border-t border-border pt-3">
              <label className="text-xs font-semibold text-text block mb-2">
                Your Cultivation Lands
              </label>
              <div className="space-y-1.5">
                {lands.map((land) => {
                  // Check if land location matches any preset region name
                  const matchedPreset = SRI_LANKA_AGRICULTURAL_REGIONS.find((r) =>
                    land.location?.toLowerCase().includes(r.name.toLowerCase())
                  )

                  return (
                    <div
                      key={land.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-subtle/50 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-medium text-text">{land.name}</span>
                        {land.location && (
                          <span className="text-muted text-[11px] ml-1.5">({land.location})</span>
                        )}
                      </div>
                      {matchedPreset ? (
                        <button
                          type="button"
                          onClick={() => handleSelectPreset(matchedPreset)}
                          className="text-[11px] font-semibold text-forest-600 hover:underline"
                        >
                          Use this region
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted">Use custom coordinates below</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual coordinate entry */}
          <form onSubmit={handleApplyCustom} className="border-t border-border pt-3 space-y-3">
            <label className="text-xs font-semibold text-text block">
              Enter Custom GPS Coordinates
            </label>
            {customError && (
              <p className="text-xs text-red-600 dark:text-red-400">{customError}</p>
            )}
            <Input
              label="Location Name"
              placeholder="e.g. Kurunegala Coconut Estate"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitude"
                placeholder="e.g. 7.4863"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                required
              />
              <Input
                label="Longitude"
                placeholder="e.g. 80.3623"
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsLocationModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Apply Coordinates</Button>
            </div>
          </form>
        </div>
      </Modal>
    </Card>
  )
}
