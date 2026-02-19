import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BonusesClient from '@/app/(app)/teamleader/bonuses/BonusesClient'

export default async function Page() {
	const user = await getUser()
	const profile = await getProfile(user?.id)

	if (!user) {
		redirect('/sign-in')
	}
	if (!profile) {
		redirect('/sign-in')
	}

	if (profile.role !== 'boss') {
		redirect('/access-denied')
	}

	return <BonusesClient user={user} />
}
