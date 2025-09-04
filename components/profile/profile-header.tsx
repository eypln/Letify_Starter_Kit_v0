import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getStatusLabel, getStatusBadgeVariant } from '@/lib/validation'
import { User as UserIcon, Mail, Calendar, Shield, UserCheck, Phone } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ProfileHeaderProps {
  user: User
  profile: Profile
}

export default function ProfileHeader({ user, profile }: ProfileHeaderProps) {
  const statusLabel = getStatusLabel(profile.status as any)
  const statusVariant = getStatusBadgeVariant(profile.status as any)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5" />
          <span>Account Information</span>
        </CardTitle>
        <CardDescription>
          Your current account status and basic information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {profile.full_name && (
              <div className="flex items-center space-x-3">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                </div>
              </div>
            )}

            {profile.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Registration Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString('en-US')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {profile.role}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Account Status</p>
                <Badge variant={statusVariant as any} className="bg-purple-500 text-white">
                  {statusLabel}
                </Badge>
              </div>
              {profile.status === 'pending_admin' && (
                <p className="text-xs text-muted-foreground">
                  Your account is awaiting admin approval. This process is usually completed within 24 hours.
                </p>
              )}
              {profile.status === 'approved' && (
                <p className="text-xs text-purple-600">
                  Your account is approved! You can use all features.
                </p>
              )}
              {profile.status === 'denied' && (
                <p className="text-xs text-red-600">
                  Account access denied. Please contact support.
                </p>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Email Verification</p>
                <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'} className={user.email_confirmed_at ? 'bg-purple-500 text-white' : 'bg-purple-200 text-purple-900'}>
                  {user.email_confirmed_at ? 'Verified' : 'Pending'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {user.email_confirmed_at 
                  ? `Verified on ${new Date(user.email_confirmed_at).toLocaleDateString('en-US')}`
                  : 'Please verify your email address'
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}