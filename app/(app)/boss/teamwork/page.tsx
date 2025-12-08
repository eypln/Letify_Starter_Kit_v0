import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamworkClient from '@/app/dashboard/teamwork/TeamworkClient'

export default async function BossTeamworkPage() {
	const user = await getUser()
	const profile = await getProfile(user?.id)

	if (!user) {
		redirect('/sign-in')
	}
	if (!profile) {
		redirect('/sign-in')
	}

	// Check if user is boss
	if (profile.role !== 'boss') {
		redirect('/access-denied')
	}

	return <TeamworkClient />
}
