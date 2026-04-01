'use client'

import { useSyncExternalStore, useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getDeferredPrompt,
  clearDeferredPrompt,
  subscribe,
  getSnapshot,
  getServerSnapshot,
} from '@/lib/pwa-install'

export function PWAInstallButton() {
  const deferredPrompt = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isInstalled, setIsInstalled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    const prompt = getDeferredPrompt()
    if (!prompt) return

    await prompt.prompt()
    const { outcome } = await prompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA: User accepted install from button')
      setIsInstalled(true)
    } else {
      console.log('PWA: User dismissed install from button')
    }

    clearDeferredPrompt()
  }, [])

  if (!mounted || isInstalled || !deferredPrompt) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleInstall}
      className="h-10 w-10 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-800 dark:hover:border-purple-600 dark:hover:bg-purple-950 transition-all"
      title="Install Letify App"
    >
      <Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      <span className="sr-only">Install App</span>
    </Button>
  )
}
