'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Loader2, CheckCircle } from 'lucide-react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  
  useEffect(() => {
    const loadUserEmail = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
      
      // Check if user just came from auth/callback
      const status = searchParams.get('status')
      if (status === 'pending') {
        setError('Email verification is still pending. Please check your email and click the verification link.')
      }
    }
    loadUserEmail()
  }, [searchParams])

  const checkVerification = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const supabase = createClient()
      
      console.log('[Verify Email] Checking verification status...')
      
      // Refresh session first
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
      
      if (sessionError) {
        console.error('[Verify Email] Session refresh error:', sessionError)
        setError('Failed to refresh session. Please try signing in again.')
        return
      }

      if (!session) {
        console.error('[Verify Email] No session found')
        setError('Session not found. Please sign in again.')
        setTimeout(() => router.push('/sign-in'), 2000)
        return
      }

      // Get fresh user data
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('[Verify Email] User error:', userError)
        setError('Failed to get user information. Please try again.')
        return
      }

      console.log('[Verify Email] Email confirmed:', !!user.email_confirmed_at)

      if (user.email_confirmed_at) {
        setSuccessMessage('Email verified successfully! Redirecting...')
        console.log('[Verify Email] Email verified, redirecting to dashboard')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1500)
      } else {
        setError('Email not yet verified. Please check your inbox and click the verification link.')
      }
    } catch (err) {
      const error = err as Error
      console.error('[Verify Email] Unexpected error:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendEmail = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        setError('Email address not found. Please sign in again.')
        return
      }

      console.log('[Verify Email] Resending verification email to:', user.email)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_WEBAPP_URL || window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('[Verify Email] Resend error:', error)
        setError('Failed to send email. Please try again in a few moments.')
      } else {
        console.log('[Verify Email] Verification email sent successfully')
        setSuccessMessage('Verification email sent successfully! Please check your inbox and spam folder.')
      }
    } catch (err) {
      const error = err as Error
      console.error('[Verify Email] Resend error:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Verify Your Email
          </CardTitle>
          <CardDescription>
            Click the verification link sent to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 text-center">
            {userEmail && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  Verification email sent to: <strong>{userEmail}</strong>
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Click the verification link in your email to confirm your account. Don&apos;t forget to check your spam folder.
            </p>

            <div className="space-y-2">
              <Button 
                onClick={checkVerification} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                Verified, Continue
              </Button>

              <Button 
                variant="outline" 
                onClick={resendEmail} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend Email
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              <button
                onClick={() => router.push('/sign-in')}
                className="text-primary hover:underline"
              >
                Sign in with a different account
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}