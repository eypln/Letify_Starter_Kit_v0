'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { LogOut, Settings, Users2, Calendar, Euro, FileText, Bell, ClipboardList, Trophy } from 'lucide-react'

export default function ManagerPage() {
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

      if (profileData?.role !== 'manager') {
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
            Welcome, {profile?.full_name || profile?.email?.split('@')[0] || 'Manager'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Oversee teams, track performance, and manage operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Link href="/manager/profile" className="block">
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

          {/* Teamwork Card */}
          <Link href="/manager/teamwork" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Users2 className="h-6 w-6 text-purple-600" />
                  <span>Teamwork</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Collaborate with your teams
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">Collaborate</button>
              </div>
            </div>
          </Link>

          {/* Team Viewings Card */}
          <Link href="/manager/team-viewings" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Calendar className="h-6 w-6 text-purple-600" />
                  <span>Team Viewings</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Track team viewing records and schedule
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View All</button>
              </div>
            </div>
          </Link>

          {/* Team Revenue Card */}
          <Link href="/manager/team-revenue" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Euro className="h-6 w-6 text-purple-600" />
                  <span>Team Revenue</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Monitor team revenue and deals
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View All</button>
              </div>
            </div>
          </Link>

          {/* Reports Card */}
          <Link href="/manager/reports" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <span>Reports</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate and view analytical reports
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View Reports</button>
              </div>
            </div>
          </Link>

          {/* Notifications Card */}
          <Link href="/manager/notifications" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Bell className="h-6 w-6 text-purple-600" />
                  <span>Notifications</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Track team deal activities
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View All</button>
              </div>
            </div>
          </Link>

          {/* Applications Card */}
          <Link href="/manager/applications" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <ClipboardList className="h-6 w-6 text-purple-600" />
                  <span>Applications</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Track job applications and hired team members
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View All</button>
              </div>
            </div>
          </Link>

          {/* Bonuses Card */}
          <Link href="/manager/bonuses" className="block">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="p-6 pb-4">
                <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                  <Trophy className="h-6 w-6 text-purple-600" />
                  <span>Bonuses</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Team bonus tiers, earnings breakdown & performance
                </p>
              </div>
              <div className="p-6 pt-0">
                <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">View Bonuses</button>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
