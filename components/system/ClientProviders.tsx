'use client'

import dynamic from 'next/dynamic'

// Lazy load non-critical components
const WebVitals = dynamic(() => import('./WebVitals'), {
  ssr: false,
})

const PWAInstallPrompt = dynamic(() => import('./PWAInstallPrompt'), {
  ssr: false,
})

export default function ClientProviders() {
  return (
    <>
      <WebVitals />
      <PWAInstallPrompt />
    </>
  )
}
