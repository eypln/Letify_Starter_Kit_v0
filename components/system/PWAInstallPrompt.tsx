'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import {
  getDeferredPrompt,
  clearDeferredPrompt,
  subscribe as pwaSubscribe,
  getSnapshot,
  getServerSnapshot,
} from '@/lib/pwa-install'

export default function PWAInstallPrompt() {
  const deferredPrompt = useSyncExternalStore(pwaSubscribe, getSnapshot, getServerSnapshot)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      const daysSinceDismissed = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceDismissed < 7) return
    }

    // Show prompt after 5 seconds if deferredPrompt is available
    if (deferredPrompt) {
      const timeout = setTimeout(() => setShowPrompt(true), 5000)
      return () => clearTimeout(timeout)
    }
  }, [deferredPrompt])

  const handleInstall = async () => {
    const prompt = getDeferredPrompt()
    if (!prompt) return

    await prompt.prompt()
    const { outcome } = await prompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      setIsInstalled(true)
    } else {
      console.log('User dismissed the install prompt')
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    }

    clearDeferredPrompt()
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 md:left-auto md:right-3 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-purple-600/80 to-purple-700/80 backdrop-blur-sm rounded-lg shadow-2xl p-3 text-white">
        <button
          onClick={handleDismiss}
          className="absolute top-1.5 right-1.5 p-0.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-2 mb-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
            <Image 
              src="/icons/Logo/96.png" 
              alt="Letify" 
              width={40} 
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="font-bold text-base mb-0.5">Install Letify</h3>
            <p className="text-xs text-purple-100">
              Add to your home screen for quick access
            </p>
          </div>
        </div>

        <ul className="space-y-1 mb-3 text-xs text-purple-100">
          <li className="flex items-center gap-1.5">
            <span className="text-green-300">✓</span>
            Instant app launch
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-green-300">✓</span>
            Offline process
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-green-300">✓</span>
            Push notifications
          </li>
        </ul>

        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-white text-purple-700 hover:bg-purple-50 h-8 text-sm px-3"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            className="border-2 border-white bg-white text-purple-700 hover:bg-purple-50 h-8 text-sm px-3"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
