import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManagerTeamRevenueClient from './ManagerTeamRevenueClient'

export default async function ManagerTeamRevenuePage() {
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

	return <ManagerTeamRevenueClient user={user} />
}
