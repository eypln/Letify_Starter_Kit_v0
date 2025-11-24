'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, LogOut } from 'lucide-react'

interface PendingUser {
  user_id: string
  email: string
  full_name: string
  phone: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    checkAdminAccess()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAdminAccess = async () => {
    try {
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

      if (profile?.role !== 'admin') {
        router.push('/access-denied')
        return
      }

      await fetchPendingUsers()
    } catch (error) {
      console.error('Error checking admin access:', error)
      toast({
        title: 'Error',
        description: 'Failed to verify admin access',
        variant: 'destructive',
      })
      router.push('/sign-in')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch('/api/admin/pending-users')
      if (!response.ok) {
        throw new Error('Failed to fetch pending users')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching pending users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive',
      })
    }
  }

  const handleApprove = async (userId: string) => {
    setApproving(userId)
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve user')
      }

      toast({
        title: 'Success',
        description: 'User approved successfully',
      })

      // Remove from list
      setUsers(users.filter((u) => u.user_id !== userId))
    } catch (error) {
      console.error('Error approving user:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve user',
        variant: 'destructive',
      })
    } finally {
      setApproving(null)
    }
  }

  const handleDeny = async (userId: string) => {
    setApproving(userId)
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'deny' }),
      })

      if (!response.ok) {
        throw new Error('Failed to deny user')
      }

      toast({
        title: 'Success',
        description: 'User denied successfully',
      })

      // Remove from list
      setUsers(users.filter((u) => u.user_id !== userId))
    } catch (error) {
      console.error('Error denying user:', error)
      toast({
        title: 'Error',
        description: 'Failed to deny user',
        variant: 'destructive',
      })
    } finally {
      setApproving(null)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage user approvals and platform settings</p>
        </div>

        {/* Pending Approvals Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Pending User Approvals</h2>
            <Badge variant="secondary" className="text-base px-3 py-1">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </Badge>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No pending approvals</p>
              <p className="text-gray-400 text-sm mt-1">All users have been approved or denied</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          📱 {user.phone || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Registered: {new Date(user.created_at).toLocaleString('en-GB')}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(user.user_id)}
                      disabled={approving === user.user_id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {approving === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(user.user_id)}
                      disabled={approving === user.user_id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {approving === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium">Pending Approvals</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium">System Status</div>
            <div className="text-3xl font-bold text-green-600 mt-2">🟢 Active</div>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium">Admin Email</div>
            <div className="text-sm font-medium text-gray-900 mt-2">admin@letify.cloud</div>
          </div>
        </div>
      </div>
    </div>
  )
}
