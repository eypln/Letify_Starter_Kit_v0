import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManagerTeamViewingsClient from '@/app/(app)/manager/team-viewings/ManagerTeamViewingsClient'

export default async function BossTeamViewingsPage() {
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

	return <ManagerTeamViewingsClient user={user} dashboardPath="/boss" />
}
