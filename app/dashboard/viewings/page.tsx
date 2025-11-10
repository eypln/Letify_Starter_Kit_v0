import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ViewingsClient from './ViewingsClient'

export default async function Page() {
	const user = await getUser()
	const profile = await getProfile(user?.id)

	if (!user) {
		redirect('/sign-in')
	}
	if (!profile) {
		redirect('/sign-in')
	}

	return <ViewingsClient user={user} profile={profile} />
}
