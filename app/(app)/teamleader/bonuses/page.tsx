import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BonusesClient from './BonusesClient'

export default async function Page() {
	const user = await getUser()
	const profile = await getProfile(user?.id)

	if (!user) {
		redirect('/sign-in')
	}
	if (!profile) {
		redirect('/sign-in')
	}

	// Check if user is teamleader
	if (profile.role !== 'teamleader') {
		redirect('/access-denied')
	}

	return <BonusesClient user={user} />
}
