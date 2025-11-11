import type { Metadata } from 'next'
import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import DashboardClient from './DashboardClient'
import { seoPages, generateOGMetadata } from '@/lib/seo'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: seoPages.dashboard.title,
  description: seoPages.dashboard.description,
  ...generateOGMetadata({
    title: seoPages.dashboard.title,
    description: seoPages.dashboard.description,
  }),
}

async function fetchDashboardStats(userId: string) {
  const supabase = await createClient()
  
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstDayISO = firstDay.toISOString()

  // Parallel queries for all stats
  const [
    listingsTotal,
    listingsMonth,
    clientsTotal,
    clientsMonth,
    viewingsTotal,
    viewingsMonth,
    activities
  ] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', firstDayISO),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', firstDayISO),
    supabase.from('viewings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('viewings').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', firstDayISO),
    supabase.from('activity').select('id, type, data, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(7)
  ])

  return {
    totalListings: listingsTotal.count ?? 0,
    sharesThisMonth: listingsMonth.count ?? 0,
    totalClients: clientsTotal.count ?? 0,
    clientsThisMonth: clientsMonth.count ?? 0,
    totalViewings: viewingsTotal.count ?? 0,
    viewingsThisMonth: viewingsMonth.count ?? 0,
    recentActivities: activities.data ?? []
  }
}

export default async function Page() {
	const user = await getUser()
	const profile = await getProfile(user?.id)

	if (!user) {
		redirect('/sign-in')
	}
	if (!profile) {
		redirect('/sign-in')
	}

	const stats = await fetchDashboardStats(user.id)

	return (
		<Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
			<DashboardClient user={user} profile={profile} stats={stats} />
		</Suspense>
	)
}
