'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Initialize global PWA install prompt capture as early as possible
import '@/lib/pwa-install'

// Lazy load non-critical components
const WebVitals = dynamic(() => import('./WebVitals'), {
  ssr: false,
})

const PWAInstallPrompt = dynamic(() => import('./PWAInstallPrompt'), {
  ssr: false,
})

const RegisterSW = dynamic(() => import('./RegisterSW'), {
  ssr: false,
})

export default function ClientProviders() {
  const router = useRouter()

  // Otomatik çıkış: 30 dakika hareketsizlik sonrası
  useEffect(() => {
    const supabase = createClient()
    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000 // 30 dakika

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const triggerLogout = async () => {
      try {
        // Aktif oturum var mı kontrol et
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        router.push('/sign-in?reason=timeout')
        router.refresh()
      } catch {
        // Hata durumunda sessizce başarısız ol
      }
    }

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(triggerLogout, INACTIVITY_LIMIT_MS)
    }

    const handleActivity = () => resetTimer()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimer()
      }
    }

    // İlk timer'ı başlat ve event listener'ları ekle
    resetTimer()
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity, { passive: true })
    window.addEventListener('scroll', handleActivity, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [router])

  return (
    <div suppressHydrationWarning>
      <RegisterSW />
      <WebVitals />
      <PWAInstallPrompt />
    </div>
  )
}
