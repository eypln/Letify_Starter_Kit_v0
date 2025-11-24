import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RevenueClient from './RevenueClient'

export default async function Page() {
	const user = await getUser()
	const profile = await getProfile(user?.id)

	if (!user) {
		redirect('/sign-in')
	}
	if (!profile) {
		redirect('/sign-in')
	}

	return <RevenueClient user={user} />
}
