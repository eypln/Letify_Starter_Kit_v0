'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      console.log('Attempting login...') // Debug log
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (error) {
        console.error('Supabase auth error:', error) // Debug log
        throw error
      }
      
      console.log('Login successful, user:', data.user) // Debug log
      
      // Check if user exists and is authenticated
      if (data.user) {
        toast({ 
          title: 'Success!', 
          description: 'Signed in successfully, redirecting to dashboard...' 
        })
        
        // Small delay to let the authentication state propagate
        setTimeout(() => {
          router.push('/dashboard') // Redirect to dashboard after login
          router.refresh() // Refresh to update server-side authentication state
        }, 500)
      }
    } catch (err: any) {
      console.error('signIn error:', err)
      toast({ 
        title: 'Sign-in error', 
        description: String(err.message || 'An error occurred'), 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-center">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {loading ? 'Checking...' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link className="text-purple-700 underline" href="/sign-up">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}