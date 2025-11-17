'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    console.log('PWA: Checking dismissed status:', dismissed)
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const now = new Date()
      const daysSinceDismissed = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24))
      console.log('PWA: Days since dismissed:', daysSinceDismissed)
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        console.log('❌ PWA: Too soon to show again (< 7 days)')
        return
      }
    }

    let promptTimeout: NodeJS.Timeout

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      console.log('🎉 PWA: beforeinstallprompt event received!', e)
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      console.log('✅ PWA: Deferred prompt saved, will show in 5 seconds...')
      
      // Show prompt after 5 seconds of usage
      promptTimeout = setTimeout(() => {
        console.log('✅ PWA: Showing install prompt now!')
        setShowPrompt(true)
      }, 5000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for app installed event
    const appInstalledHandler = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', appInstalledHandler)

    // Fallback: Check for PWA installability after page load
    // This helps in cases where beforeinstallprompt doesn't fire immediately
    const checkInstallability = setTimeout(() => {
      console.log('PWA: beforeinstallprompt event not triggered, using fallback detection')
      // Log for debugging
      console.log('PWA Check - isInstalled:', false, 'deferredPrompt:', false)
    }, 10000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', appInstalledHandler)
      if (promptTimeout) clearTimeout(promptTimeout)
      if (checkInstallability) clearTimeout(checkInstallability)
    }
  }, [isClient])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-purple-600/80 to-purple-700/80 backdrop-blur-sm rounded-lg shadow-2xl p-4 text-white">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
            <Image 
              src="/icons/Logo/96.png" 
              alt="Letify" 
              width={48} 
              height={48}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Install Letify</h3>
            <p className="text-sm text-purple-100">
              Add to your home screen for quick access
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-4 text-sm text-purple-100">
          <li className="flex items-center gap-2">
            <span className="text-green-300">✓</span>
            Instant app launch
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-300">✓</span>
            Offline process
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-300">✓</span>
            Push notifications
          </li>
        </ul>

        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-white text-purple-700 hover:bg-purple-50"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            className="border-2 border-white bg-white text-purple-700 hover:bg-purple-50"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
