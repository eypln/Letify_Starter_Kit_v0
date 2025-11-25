'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { UserRole } from '@/lib/validation'

function SignUpForm() {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string>(UserRole.AGENT)
  const [loading, setLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [existingUser, setExistingUser] = useState<{ email: string; role: string; emailVerified: boolean } | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkExistingSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user && user.email_confirmed_at) {
          // Only show "Already Signed In" if email is verified
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          setExistingUser({
            email: user.email || '',
            role: profile?.role || 'user',
            emailVerified: !!user.email_confirmed_at
          })
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setCheckingSession(false)
      }
    }
    
    checkExistingSession()
  }, [supabase])

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
    e.preventDefault()
    if (password !== password2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const redirectTo = `${process.env.NEXT_PUBLIC_WEBAPP_URL || window.location.origin}/auth/callback`
      
      console.log('[Sign Up] Starting registration with redirect:', redirectTo)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          },
        },
      })
      
      if (error) throw error
      
      console.log('[Sign Up] Registration successful, user ID:', data.user?.id)

      // Send admin approval notification email
      try {
        await fetch('/api/auth/send-admin-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            email,
            phone,
          }),
        })
      } catch (emailError) {
        console.error('Failed to send admin approval email:', emailError)
        // Don't fail signup if admin email fails to send
      }

      // Show verify email screen
      setRegisteredEmail(email)
      setRegistrationSuccess(true)
      
      toast({ 
        title: 'Registration successful', 
        description: 'A verification link has been sent to your email. Please check your inbox and spam folder.' 
      })
    } catch (err) {
      const error = err as Error;
      console.error('[Sign Up] Registration error:', error);
      toast({ 
        title: 'Registration error', 
        description: String(error.message || error), 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show verify email screen after successful registration
  if (registrationSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verify Your Email</h1>
            <p className="text-gray-600 mb-6">
              We&#39;ve sent a verification link to:
            </p>
            <p className="font-semibold text-purple-600 mb-6">{registeredEmail}</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 mb-2">
                <strong>📧 Check your email</strong>
              </p>
              <p className="text-sm text-blue-700">
                Click the verification link in the email to confirm your account. 
                Don&#39;t forget to check your spam folder if you don&#39;t see it in your inbox.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>⏳ What&#39;s next?</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 text-left">
                <li>1. Verify your email by clicking the link</li>
                <li>2. Wait for admin approval</li>
                <li>3. You&#39;ll receive another email when approved</li>
                <li>4. Then you can sign in and start using Letify!</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.href = '/sign-in'}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If user is already logged in with verified email, show options
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
              {loading ? 'Signing out...' : 'Sign Out & Create New Account'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link className="text-purple-600 hover:text-purple-700 underline font-medium" href="/sign-in">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12" suppressHydrationWarning>
      <div className="w-full max-w-md bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up for Letify</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              suppressHydrationWarning
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 xxx xxx xxxx"
              required
              suppressHydrationWarning
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              suppressHydrationWarning
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              suppressHydrationWarning
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={UserRole.AGENT}>Agent</option>
              <option value={UserRole.TEAMLEADER}>Team Leader</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.BOSS}>Boss</option>
            </select>
          </div>
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              suppressHydrationWarning
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label htmlFor="pw2" className="block text-sm font-medium text-gray-700 mb-1">
              Repeat Password
            </label>
            <input
              id="pw2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              minLength={6}
              required
              suppressHydrationWarning
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? 'Submitting...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link className="text-purple-600 hover:text-purple-700 underline font-medium" href="/sign-in">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}