'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function TeamLeaderPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profile?.role !== 'teamleader') {
        router.push('/access-denied')
      }
    }

    checkAccess()
  }, [router, supabase])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'An error occurred during logout')
      }

      router.push('/sign-in')
      router.refresh()
    } catch (error) {
      const err = error as Error
      console.error('Logout error:', error)
      alert('Logout failed: ' + (err.message || 'An error occurred during logout'))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Logout Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Leader Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome to your Team Leader workspace</p>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Leader Features Coming Soon</h2>
            <p className="text-gray-600">This section is under development. Features will include:</p>
            <ul className="mt-4 space-y-2 text-gray-600 max-w-md mx-auto">
              <li>• View team member viewings</li>
              <li>• Receive viewing notifications</li>
              <li>• Monitor team activity</li>
              <li>• View team analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
