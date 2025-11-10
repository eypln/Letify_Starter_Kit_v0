import type { Metadata } from 'next'
import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import DashboardClient from './DashboardClient'
import { seoPages, generateOGMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: seoPages.dashboard.title,
  description: seoPages.dashboard.description,
  ...generateOGMetadata({
    title: seoPages.dashboard.title,
    description: seoPages.dashboard.description,
  }),
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

	return (
		<Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
			<DashboardClient user={user} profile={profile} />
		</Suspense>
	)
}
