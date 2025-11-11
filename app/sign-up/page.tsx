'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

export default function SignUpPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

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
          },
        },
      })
      if (error) throw error
      toast({ title: 'Registration successful', description: 'A verification link has been sent to your email.' })
    } catch (err: any) {
      console.error('signUp error:', err)
      toast({ title: 'Registration error', description: String(err.message || err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
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