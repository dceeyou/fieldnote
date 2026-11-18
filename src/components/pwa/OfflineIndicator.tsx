import { useState, useEffect } from 'react'
import { WifiOff, Wifi, X } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [justReconnected, setJustReconnected] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      setJustReconnected(true)
      const timer = setTimeout(() => {
        setJustReconnected(false)
      }, 3500)
      return () => clearTimeout(timer)
    }

    function handleOffline() {
      setIsOffline(true)
      setJustReconnected(false)
      setDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (justReconnected) {
    return (
      <aside
        aria-label="Network status notification"
        className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all"
      >
        <Wifi size={14} className="shrink-0" />
        <span>Connection restored · Back online</span>
      </aside>
    )
  }

  if (isOffline && !dismissed) {
    return (
      <aside
        aria-label="Offline warning banner"
        className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-200 shadow-sm transition-all"
      >
        <div className="flex items-center gap-2">
          <WifiOff size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Offline mode active · Local IndexedDB records remain fully viewable.</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
          aria-label="Dismiss offline banner"
        >
          <X size={14} />
        </button>
      </aside>
    )
  }

  return null
}
