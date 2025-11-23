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
        // Get error from URL if present
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error(`Auth error: ${error} - ${errorDescription}`)
          // Redirect to sign-in with error message
          router.push(`/sign-in?error=${encodeURIComponent(errorDescription || error)}`)
          return
        }

        // Exchange code for session
        // The Supabase client will automatically handle the URL hash parameters
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push('/sign-in?error=Failed to create session')
          return
        }

        if (!session) {
          console.error('No session found after callback')
          router.push('/sign-in?error=Session not found')
          return
        }

        // Check if email is confirmed
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user?.email_confirmed_at) {
          // Email not yet confirmed, redirect to verify-email page
          router.push('/verify-email')
          return
        }

        // Email confirmed, check profile status
        const { data: profile } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('user_id', user.id)
          .single()

        if (profile?.status === 'pending_admin') {
          // Waiting for admin approval
          router.push('/waiting-approval')
        } else if (profile?.status === 'denied') {
          // User denied
          router.push('/access-denied')
        } else if (profile?.status === 'approved') {
          // Redirect based on role
          const redirectPath = (() => {
            switch (profile.role) {
              case 'admin':
                return '/admin'
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

          router.push(redirectPath)
        } else {
          // Default redirect
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/sign-in?error=An error occurred during authentication')
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
