'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

interface ApprovedUser {
  user_id: string
  email: string
  full_name: string
  phone: string
  role: string
  status: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([])
  const [blockedUsers, setBlockedUsers] = useState<ApprovedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [denyingUserId, setDenyingUserId] = useState<string | null>(null)
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null)
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [approvedUsersCount, setApprovedUsersCount] = useState(0)

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
      await fetchApprovedUsersCount()
      await fetchApprovedUsers()
      await fetchBlockedUsers()
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

  const fetchApprovedUsersCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      if (error) throw error
      setApprovedUsersCount(count || 0)
    } catch (error) {
      console.error('Error fetching approved users count:', error)
    }
  }

  const fetchApprovedUsers = async () => {
    try {
      const response = await fetch('/api/admin/approved-users')
      if (!response.ok) {
        throw new Error('Failed to fetch approved users')
      }
      const data = await response.json()
      setApprovedUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching approved users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load approved users',
        variant: 'destructive',
      })
    }
  }

  const fetchBlockedUsers = async () => {
    try {
      const response = await fetch('/api/admin/blocked-users')
      if (!response.ok) {
        throw new Error('Failed to fetch blocked users')
      }
      const data = await response.json()
      
      setBlockedUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching blocked users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load blocked users',
        variant: 'destructive',
      })
    }
  }

  const handleApprove = async (userId: string) => {
    setApprovingUserId(userId)
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
      // Refresh approved users count and list
      await fetchApprovedUsersCount()
      await fetchApprovedUsers()
    } catch (error) {
      console.error('Error approving user:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve user',
        variant: 'destructive',
      })
    } finally {
      setApprovingUserId(null)
    }
  }

  const handleDeny = async (userId: string) => {
    setDenyingUserId(userId)
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
      setDenyingUserId(null)
    }
  }

  const handleBlock = async (userId: string) => {
    if (!confirm('Are you sure you want to block this user? They will lose access to the platform.')) {
      return
    }

    setBlockingUserId(userId)
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'block' }),
      })

      if (!response.ok) {
        throw new Error('Failed to block user')
      }

      toast({
        title: 'Success',
        description: 'User blocked successfully',
      })

      // Refresh the approved users list and count
      await fetchApprovedUsers()
      await fetchApprovedUsersCount()
      await fetchBlockedUsers()
    } catch (error) {
      console.error('Error blocking user:', error)
      toast({
        title: 'Error',
        description: 'Failed to block user',
        variant: 'destructive',
      })
    } finally {
      setBlockingUserId(null)
    }
  }

  const handleUnblock = async (userId: string) => {
    if (!confirm('Are you sure you want to unblock this user? They will regain access to the platform.')) {
      return
    }

    setUnblockingUserId(userId)
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' }),
      })

      if (!response.ok) {
        throw new Error('Failed to unblock user')
      }

      toast({
        title: 'Success',
        description: 'User unblocked successfully',
      })

      // Refresh all lists
      await fetchApprovedUsers()
      await fetchApprovedUsersCount()
      await fetchBlockedUsers()
    } catch (error) {
      console.error('Error unblocking user:', error)
      toast({
        title: 'Error',
        description: 'Failed to unblock user',
        variant: 'destructive',
      })
    } finally {
      setUnblockingUserId(null)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Reset theme preference to light for new user
      localStorage.removeItem('theme')
      document.documentElement.classList.remove('dark')
      
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

      router.push('/')
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
        <div className="flex items-center justify-between mb-4">
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
            ← Admin Dashboard
          </Link>
          <div className="flex justify-end">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
          </div>
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
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors"
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
                      disabled={approvingUserId === user.user_id || denyingUserId === user.user_id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {approvingUserId === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(user.user_id)}
                      disabled={approvingUserId === user.user_id || denyingUserId === user.user_id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {denyingUserId === user.user_id ? (
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium">Pending Approvals</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="text-gray-600 text-sm font-medium">Approved Users</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{approvedUsersCount}</div>
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

        {/* Approved Users Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Users</h2>
            <Badge variant="secondary" className="text-base px-3 py-1">
              {approvedUsers.length} {approvedUsers.length === 1 ? 'user' : 'users'}
            </Badge>
          </div>

          {approvedUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No approved users yet</p>
              <p className="text-gray-400 text-sm mt-1">Approved users will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Full Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedUsers.map((user) => (
                    <tr key={user.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-600 font-mono">
                        {user.user_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {user.full_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.phone || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            user.role === 'admin' ? 'destructive' : 
                            user.role === 'manager' ? 'default' : 
                            user.role === 'boss' ? 'destructive' :
                            user.role === 'teamleader' ? 'default' :
                            'secondary'
                          }
                          className={`capitalize ${
                            user.role === 'boss' ? 'bg-orange-600 hover:bg-orange-700' :
                            user.role === 'teamleader' ? 'bg-blue-600 hover:bg-blue-700' :
                            ''
                          }`}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize text-green-700 border-green-300">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleBlock(user.user_id)}
                          disabled={blockingUserId === user.user_id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-md font-medium transition-colors"
                        >
                          {blockingUserId === user.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Block
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Blocked Users Section */}
        {blockedUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md border border-red-200 p-6 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Blocked Users</h2>
              <Badge variant="destructive" className="text-base px-3 py-1">
                {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Full Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedUsers.map((user) => (
                    <tr key={user.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-600 font-mono">
                        {user.user_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {user.full_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.phone || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            user.role === 'admin' ? 'destructive' : 
                            user.role === 'manager' ? 'default' : 
                            user.role === 'boss' ? 'destructive' :
                            user.role === 'teamleader' ? 'default' :
                            'secondary'
                          }
                          className={`capitalize ${
                            user.role === 'boss' ? 'bg-orange-600 hover:bg-orange-700' :
                            user.role === 'teamleader' ? 'bg-blue-600 hover:bg-blue-700' :
                            ''
                          }`}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="destructive" className="capitalize">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleUnblock(user.user_id)}
                          disabled={unblockingUserId === user.user_id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded-md font-medium transition-colors"
                        >
                          {unblockingUserId === user.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
