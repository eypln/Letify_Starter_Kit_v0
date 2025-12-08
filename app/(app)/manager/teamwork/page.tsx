import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamworkClient from '@/app/dashboard/teamwork/TeamworkClient'

export default async function ManagerTeamworkPage() {
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

	return <TeamworkClient />
}
