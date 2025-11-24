'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { UserRole } from '@/lib/validation'

export default function SignUpPage() {
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
  const [existingUser, setExistingUser] = useState<{ email: string; role: string } | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkExistingSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
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
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setCheckingSession(false)
      }
    }
    
    checkExistingSession()
  }, [])

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
      const redirectTo =
        (process.env.NEXT_PUBLIC_WEBAPP_URL || 'http://localhost:3000') + '/auth/callback'
      const { error } = await supabase.auth.signUp({
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

      toast({ title: 'Registration successful', description: 'A verification link has been sent to your email.' })
    } catch (err) {
      const error = err as Error;
      console.error('signUp error:', error);
      toast({ title: 'Registration error', description: String(error.message || error), variant: 'destructive' });
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