'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FileText, LogOut, Receipt, Users } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/theme-toggle'

interface AdminProfile {
  full_name?: string
  email?: string
}

const cards = [
  {
    href: '/admin/users',
    title: 'Users',
    description: 'Manage approvals, roles, active users and blocked accounts',
    action: 'Manage Users',
    icon: Users,
  },
  {
    href: '/admin/invoices',
    title: 'Invoices',
    description: 'Review invoice requests and notification delivery status',
    action: 'View Invoices',
    icon: Receipt,
  },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .single()

      if (profileData?.role !== 'admin') {
        router.push('/access-denied')
        return
      }

      setProfile({
        full_name: profileData.full_name || undefined,
        email: user.email || undefined,
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
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'An error occurred during logout')
      }

      router.push('/')
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during logout'
      console.error('Logout error:', error)
      alert(`Logout failed: ${message}`)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <main className="min-h-screen">
      <div className="pt-8 pb-8 container mx-auto px-4 md:px-8 lg:px-16">
        <div className="flex justify-end items-center gap-2 mb-4">
          <ThemeToggle />
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
            Welcome, {profile?.full_name || profile?.email?.split('@')[0] || 'Admin'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage users, approvals and invoice operations from one place
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {cards.map(({ href, title, description, action, icon: Icon }) => (
            <Link key={href} href={href} className="block">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="p-6 pb-4">
                  <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center space-x-2">
                    <Icon className="h-6 w-6 text-purple-600" />
                    <span>{title}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">{description}</p>
                </div>
                <div className="p-6 pt-0">
                  <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-md transition-colors">
                    {action}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Admin tools are restricted to authorized administrators.</span>
        </div>
      </div>
    </main>
  )
}
