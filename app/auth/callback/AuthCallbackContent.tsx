'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[Auth Callback] Starting email verification process...')
        
        // Get error from URL if present
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const code = searchParams.get('code')

        if (error) {
          console.error(`[Auth Callback] URL Error: ${error} - ${errorDescription}`)
          router.push(`/sign-in?error=${encodeURIComponent(errorDescription || error)}`)
          return
        }

        if (!code) {
          console.error('[Auth Callback] No code parameter found')
          router.push('/sign-in?error=Invalid verification link')
          return
        }

        console.log('[Auth Callback] Code found, verifying...')

        // CRITICAL: Let Supabase SSR handle the code exchange automatically
        // Just wait for it to process
        await new Promise(resolve => setTimeout(resolve, 500))

        // Get current session after auto-exchange
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError)
          router.push('/sign-in?error=Failed to retrieve session')
          return
        }

        if (!session) {
          console.error('[Auth Callback] No session found after code exchange')
          router.push('/sign-in?error=Email verification failed. Please try again.')
          return
        }

        // Refresh user data to get latest email_confirmed_at
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('[Auth Callback] User error:', userError)
          router.push('/sign-in?error=Failed to get user information')
          return
        }

        console.log('[Auth Callback] User:', user.email, 'Email confirmed:', !!user.email_confirmed_at)

        if (!user.email_confirmed_at) {
          console.warn('[Auth Callback] Email not yet confirmed')
          router.push('/verify-email?status=pending')
          return
        }

        // Email confirmed successfully!
        console.log('[Auth Callback] Email verified successfully!')
        
        // Check profile status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('user_id', user.id)
          .single()

        if (profileError) {
          console.error('[Auth Callback] Profile error:', profileError)
          // Continue anyway, will be handled by middleware
        }

        if (!profile) {
          console.warn('[Auth Callback] No profile found, redirecting to waiting approval')
          router.push('/waiting-approval')
          return
        }

        console.log('[Auth Callback] Profile status:', profile.status, 'Role:', profile.role)

        // If user just verified email and is pending admin approval, send notification email
        if (profile.status === 'pending_admin') {
          // Send email verified notification
          try {
            await fetch('/api/auth/send-email-verified', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
            })
            console.log('[Auth Callback] Email verified notification sent')
          } catch (emailError) {
            console.error('[Auth Callback] Failed to send email notification:', emailError)
            // Continue anyway - don't block user flow
          }
          
          router.push('/waiting-approval')
          return
        } else if (profile.status === 'denied' || profile.status === 'blocked') {
          router.push('/access-denied')
        } else if (profile.status === 'approved') {
          const redirectPath = (() => {
            switch (profile.role) {
              case 'admin':
                return '/admin'
              case 'intern':
                return '/intern'
              case 'teamleader':
                return '/teamleader'
              case 'manager':
                return '/manager'
              case 'boss':
                return '/boss'
              default:
                return '/dashboard'
            }
          })()
          
          console.log('[Auth Callback] Redirecting to:', redirectPath)
          router.push(redirectPath)
        } else {
          console.log('[Auth Callback] Default redirect to dashboard')
          router.push('/dashboard')
        }
      } catch (error) {
        const err = error as Error
        console.error('[Auth Callback] Unexpected error:', err)
        router.push(`/sign-in?error=${encodeURIComponent('Authentication error: ' + err.message)}`)
      }
    }

    handleAuthCallback()
  }, [router, searchParams, supabase])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Completing sign up...</h2>
        <p className="text-gray-600 mt-2">Please wait while we verify your email</p>
      </div>
    </div>
  )
}
