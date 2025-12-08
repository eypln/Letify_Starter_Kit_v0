'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

function SignInForm() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [existingUser, setExistingUser] = useState<{ email: string; role: string } | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Timeout nedeniyle çıkış yapıldıysa uyar
    if (searchParams.get('reason') === 'timeout') {
      toast({
        title: 'Session Expired',
        description: 'You were automatically signed out due to 30 minutes of inactivity.',
        variant: 'destructive',
      })
    }
    
    // Check if user is already logged in
    const checkExistingSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // CRITICAL: Only show "Already Signed In" if email is verified
        if (user && user.email_confirmed_at) {
          // Get user's role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          setExistingUser({
            email: user.email || '',
            role: profile?.role || 'user'
          })
        } else if (user && !user.email_confirmed_at) {
          // User exists but email not verified - sign them out
          console.log('[Sign In] User found with unverified email - signing out')
          await supabase.auth.signOut()
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setCheckingSession(false)
      }
    }
    
    checkExistingSession()
  }, [searchParams, toast, supabase])

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setExistingUser(null)
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      })
    } catch (error) {
      console.error('Sign out error:', error)
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleContinueToDashboard = () => {
    if (!existingUser) return
    
    const redirectPath = (() => {
      switch (existingUser.role) {
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
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      if (data.user) {
        // CRITICAL: Check if email is verified
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut()
          toast({
            title: 'Email not verified',
            description: 'Please verify your email address before signing in. Check your inbox for the verification link.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Get user's role to redirect to appropriate page
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('user_id', data.user.id)
          .single()

        // Determine redirect path based on role
        const redirectPath = (() => {
          if (profile?.status === 'pending_admin') {
            return '/waiting-approval'
          }
          if (profile?.status === 'denied') {
            return '/access-denied'
          }
          
          switch (profile?.role) {
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

        toast({
          title: 'Signed in!',
          description: 'You have successfully signed in.',
        });
        
        router.push(redirectPath);
      }
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is already logged in, show options
  if (existingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Already Signed In</h1>
          
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-700 mb-2">
              You are currently signed in as:
            </p>
            <p className="font-semibold text-purple-900">{existingUser.email}</p>
            <p className="text-xs text-gray-600 mt-1 capitalize">Role: {existingUser.role}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleContinueToDashboard}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Continue to Dashboard
            </button>
            
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing out...' : 'Sign Out & Login with Different Account'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link className="text-purple-600 hover:text-purple-700 underline font-medium" href="/sign-up">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        <form onSubmit={onSubmit} className="space-y-4" key="sign-in-form">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              key="email-input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link 
                href="/forgot-password" 
                className="text-sm text-purple-600 hover:text-purple-700 underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                key="password-input"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? 'Checking...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link className="text-purple-600 hover:text-purple-700 underline font-medium" href="/sign-up">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}