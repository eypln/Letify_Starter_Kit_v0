'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Always use the hand-crafted service-worker.js which includes push + fetch handler.
      // next-pwa is disabled (Workbox injectManifest drops our custom fetch listener).
      const swPath = '/service-worker.js';
      navigator.serviceWorker
        .register(swPath, { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope)
          
          // Check if update found
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New service worker available, reload to update')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}
