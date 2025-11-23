'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BossPage() {
  const router = useRouter()
  const supabase = createClient()

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

      if (profile?.role !== 'boss') {
        router.push('/access-denied')
      }
    }

    checkAccess()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Boss Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome to your Boss workspace</p>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">💼</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Boss Features Coming Soon</h2>
            <p className="text-gray-600">This section is under development. Features will include:</p>
            <ul className="mt-4 space-y-2 text-gray-600 max-w-md mx-auto">
              <li>• Approve revenue completions</li>
              <li>• Receive revenue notifications</li>
              <li>• View business analytics</li>
              <li>• Monitor financials</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
