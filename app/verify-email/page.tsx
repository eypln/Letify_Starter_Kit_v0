'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function VerifyEmailPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkVerification = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Session'ı yenile
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError('Session information could not be retrieved')
        return
      }

      if (!session) {
        setError('Session not found. Please sign in again.')
        router.push('/sign-in')
        return
      }

      // User bilgisini tekrar al
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError('User information could not be retrieved')
        return
      }

      if (user.email_confirmed_at) {
        // Email verified, redirect to dashboard
        router.push('/dashboard')
        router.refresh()
      } else {
        setError('Email not yet verified. Please check your inbox.')
      }
    } catch (err) {
  setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendEmail = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        setError('Email address not found')
        return
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/auth/callback`,
        },
      })

      if (error) {
        setError('Email could not be sent. Please try again.')
      } else {
        setError(null)
        // Success message can be shown here
      }
    } catch (err) {
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

          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Check your inbox and click the verification link. Don't forget to check your spam folder.
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