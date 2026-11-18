import { useState, useEffect } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '../ui/Button.tsx'

export function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function handleUpdateAvailable(event: Event) {
      const customEvent = event as CustomEvent<{ registration?: ServiceWorkerRegistration }>
      const worker = customEvent.detail?.registration?.waiting || null
      if (worker) {
        setWaitingWorker(worker)
        setDismissed(false)
      }
    }

    let refreshing = false
    function handleControllerChange() {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    window.addEventListener('agriflow-sw-update', handleUpdateAvailable)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    }

    return () => {
      window.removeEventListener('agriflow-sw-update', handleUpdateAvailable)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      }
    }
  }, [])

  function handleApplyUpdate() {
    if (!waitingWorker) {
      window.location.reload()
      return
    }
    setIsUpdating(true)
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!waitingWorker || dismissed) return null

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Application update notification"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-forest-500/40 bg-surface p-3.5 shadow-lg md:bottom-6 md:left-auto md:right-6"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-900/40 dark:text-forest-200">
          <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text">Update available</p>
          <p className="text-[11px] text-muted truncate">
            A newer version of AgriFlow is ready.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="primary"
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="h-8 px-3 text-xs"
        >
          {isUpdating ? 'Updating...' : 'Reload'}
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notification"
          className="rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-text transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  )
}
