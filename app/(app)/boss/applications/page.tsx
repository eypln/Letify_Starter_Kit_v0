import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationsClient from '../../teamleader/applications/ApplicationsClient'

export default async function Page() {
	const user = await getUser()
	const profile = await getProfile(user?.id)

	if (!user) {
		redirect('/sign-in')
	}
	if (!profile) {
		redirect('/sign-in')
	}

	// Check if user is boss or admin
	if (!['boss', 'admin'].includes(profile.role)) {
		redirect('/access-denied')
	}

	return <ApplicationsClient user={user} dashboardUrl="/boss" />
}
