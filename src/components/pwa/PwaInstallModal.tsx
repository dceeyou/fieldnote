import { useState, useEffect } from 'react'
import {
  Smartphone,
  Share2,
  PlusSquare,
  Laptop,
  CheckCircle2,
  Download,
} from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as unknown as { standalone?: boolean }).standalone)
    setIsStandalone(isStandaloneMode)

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIos(/iphone|ipad|ipod/.test(userAgent))

    // Catch Chrome/Android install prompt
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        onClose()
      }
      setDeferredPrompt(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Install AgriFlow App"
      description="Install AgriFlow as a standalone desktop or mobile application for instant offline-first access."
      className="max-w-md"
    >
      <div className="space-y-4 pt-2">
        {isStandalone ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
            <h4 className="font-semibold text-sm text-text">Already Installed</h4>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              You are currently running AgriFlow in standalone application mode.
            </p>
          </div>
        ) : (
          <>
            {deferredPrompt && (
              <div className="rounded-xl border border-forest-500/30 bg-forest-50 p-4 dark:bg-forest-950/30">
                <Button
                  onClick={handleInstallClick}
                  variant="primary"
                  className="w-full gap-2 font-semibold"
                >
                  <Download size={16} /> Install Now
                </Button>
              </div>
            )}

            {isIos ? (
              /* iOS Safari Instructions */
              <div className="space-y-3 rounded-xl border border-border bg-subtle/50 p-4 text-xs text-text">
                <div className="flex items-center gap-2 font-semibold text-forest-700 dark:text-forest-300">
                  <Smartphone size={16} />
                  <span>Installing on iPhone / iPad (Safari)</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-muted leading-relaxed">
                  <li>
                    Tap the <strong>Share</strong> button <Share2 size={13} className="inline mx-1 text-text" /> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare size={13} className="inline mx-1 text-text" />.
                  </li>
                  <li>
                    Tap <strong>Add</strong> in the top-right corner to finish.
                  </li>
                </ol>
              </div>
            ) : (
              /* Android / Desktop Chrome / Edge Instructions */
              <div className="space-y-3 rounded-xl border border-border bg-subtle/50 p-4 text-xs text-text">
                <div className="flex items-center gap-2 font-semibold text-forest-700 dark:text-forest-300">
                  <Laptop size={16} />
                  <span>Android & Desktop (Chrome / Edge)</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-muted leading-relaxed">
                  <li>
                    Click the <strong>Install</strong> icon in the browser address bar (top right) or browser menu (⋮).
                  </li>
                  <li>
                    Select <strong>Install AgriFlow</strong> or <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    Launch AgriFlow directly from your home screen or application launcher.
                  </li>
                </ol>
              </div>
            )}
          </>
        )}

        <div className="pt-2">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
