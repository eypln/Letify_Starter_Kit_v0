'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration.scope)
          console.log('Service Worker state:', registration.active?.state)
          
          // Log when service worker is ready
          navigator.serviceWorker.ready.then((reg) => {
            console.log('✅ Service Worker is ready and active')
            console.log('Push Manager available:', 'pushManager' in reg)
          })
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error)
        })
    } else {
      console.warn('⚠️ Service Worker not supported in this browser')
    }
  }, [])

  return null
}
