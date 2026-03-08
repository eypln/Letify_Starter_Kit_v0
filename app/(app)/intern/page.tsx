'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { LogOut, Settings, FileText, Users, Users2, ClipboardCheck } from 'lucide-react'

export default function InternPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profile, setProfile] = useState<{ full_name?: string; email?: string } | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .single()

      if (profileData?.role !== 'intern') {
        router.push('/access-denied')
        return
      }

      setProfile({
        full_name: profileData.full_name || undefined,
        email: user.email || undefined
      })
    }

    checkAccess()
  }, [router, supabase])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="pt-8 pb-8 container mx-auto px-4 md:px-8 lg:px-16">
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome, {profile?.full_name || profile?.email?.split('@')[0] || 'Intern'}! 🎓
          </h1>
          <p className="text-muted-foreground mt-2">
            Your internship dashboard — track your tasks, manage listings, and grow your career
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Link href="/dashboard/profile" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-purple-600" />
                  <span>Profile</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Account settings and integrations
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Settings</button>
              </div>
            </div>
          </Link>

          {/* Clients Card */}
          <Link href="/dashboard/clients" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600" />
                  <span>Clients</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Client management and reporting
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Manage</button>
              </div>
            </div>
          </Link>

          {/* Listings Card */}
          <Link href="/dashboard/listings" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <span>Listings</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  View and manage property listings
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View</button>
              </div>
            </div>
          </Link>

          {/* Teamwork Card */}
          <Link href="/dashboard/teamwork" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Users2 className="h-6 w-6 text-purple-600" />
                  <span>Teamwork</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Collaborate with your teammates
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Collaborate</button>
              </div>
            </div>
          </Link>

          {/* Internship Tasks Card */}
          <Link href="/dashboard/internship-tasks" className="block">
            <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-indigo-50 text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full ring-2 ring-purple-200">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <ClipboardCheck className="h-6 w-6 text-purple-600" />
                  <span>Internship Tasks</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Your daily tasks, progress tracking & guides
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors">View Tasks</button>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
