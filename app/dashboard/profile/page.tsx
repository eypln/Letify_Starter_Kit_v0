import { getUser, getProfile, getUserIntegrations } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileHeader from '@/components/profile/profile-header'
import ProfileInfoForm from '@/components/profile/profile-info-form'
import FacebookIntegrationForm from '@/components/profile/facebook-integration-form'
import { Separator } from '@/components/ui/separator'

export default async function ProfilePage() {
  const user = await getUser()
  const profile = await getProfile()
  const integrations = await getUserIntegrations()

  if (!user) {
    redirect('/sign-in')
  }

  if (!profile) {
    redirect('/sign-in')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="text-muted-foreground">
          Hesap bilgilerinizi ve entegrasyonlarınızı yönetin
        </p>
      </div>

      <ProfileHeader user={user} profile={profile} />
      
      <Separator />
      
      <ProfileInfoForm user={user} profile={profile} />
      
      <Separator />
      
      <FacebookIntegrationForm integrations={integrations} />
    </div>
  )
}