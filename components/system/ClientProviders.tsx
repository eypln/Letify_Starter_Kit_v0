'use client'

import dynamic from 'next/dynamic'

// Lazy load non-critical components
const WebVitals = dynamic(() => import('./WebVitals'), {
  ssr: false,
})

export default function ClientProviders() {
  return (
    <>
      <WebVitals />
    </>
  )
}
