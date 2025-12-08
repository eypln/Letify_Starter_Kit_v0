import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ManagerReportsPage() {
  const user = await getUser()
  const profile = await getProfile(user?.id)

  if (!user) {
    redirect('/sign-in')
  }
  if (!profile) {
    redirect('/sign-in')
  }

  // Check if user is manager
  if (profile.role !== 'manager') {
    redirect('/access-denied')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 md:px-8 lg:px-16">
        <div className="relative mt-8">
          <Link href="/manager" className="absolute -top-10 right-0 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 z-10">
            <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
            </svg>
            Dashboard
          </Link>

          <div className="mt-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-gray-600 mb-8">Generate and view analytical reports</p>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12">
              <div className="text-center max-w-md mx-auto">
                <div className="text-7xl mb-6">📊</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Reports Coming Soon</h2>
                <p className="text-gray-600 mb-6">
                  We're working on comprehensive reporting features that will help you analyze and track your team's performance.
                </p>
                <div className="bg-purple-50 rounded-lg p-4 text-left">
                  <p className="text-sm font-semibold text-purple-900 mb-2">Upcoming Features:</p>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Team performance analytics</li>
                    <li>• Revenue trend reports</li>
                    <li>• Agent comparison metrics</li>
                    <li>• Custom report generation</li>
                    <li>• Export to PDF/Excel</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
