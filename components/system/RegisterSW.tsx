'use client'

import { useEffect } from 'react'

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Wait for page load to register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✅ Service Worker registered successfully:', registration.scope)
            console.log('Service Worker state:', registration.active?.state)
            
            // Wait for service worker to be ready
            return navigator.serviceWorker.ready
          })
          .then((reg) => {
            console.log('✅ Service Worker is ready and active')
            console.log('Push Manager available:', 'pushManager' in reg)
            
            // Handle updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing
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
      })
    } else {
      console.warn('⚠️ Service Worker not supported in this browser')
    }
  }, [])

  return null
}
