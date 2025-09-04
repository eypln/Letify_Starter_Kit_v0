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
    <div className="max-w-4xl mx-auto p-6 space-y-8 relative">
      {/* Top right dashboard button */}
      <div className="absolute top-6 right-8 z-10">
        <a href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50">
          <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
          </svg>
          Dashboard
        </a>
      </div>
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account information and integrations
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