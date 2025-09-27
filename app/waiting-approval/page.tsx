import { getUser, getProfile, getUserIntegrations } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, User, Settings } from 'lucide-react'
import Link from 'next/link'

export default async function WaitingApprovalPage() {
  const user = await getUser()
  const profile = await getProfile()
  const integrations = await getUserIntegrations()

  if (!user) {
    redirect('/sign-in')
  }

  if (!profile) {
    redirect('/sign-in')
  }

  if (profile.status === 'approved') {
    redirect('/dashboard')
  }

  if (profile.status === 'denied') {
    redirect('/access-denied')
  }

  const hasCompletedIntegrations = integrations && 
    integrations.fb_page_id && 
    integrations.fb_access_token && 
    integrations.fb_app_secret

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            <Clock className="h-10 w-10 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Your Account is Awaiting Admin Approval
          </CardTitle>
          <CardDescription>
            Welcome to the Letify platform! Your account is under review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Your account is being reviewed by our admin team. This process is usually completed within 24 hours.
            </p>
          </div>

          {!hasCompletedIntegrations && (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> To speed up admin approval, it is recommended to complete your profile settings. You can shorten the approval process by adding your Facebook integration information.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <User className="mr-2 h-5 w-5" />
                Account Status
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email Verification:</span>
                  <span className={`font-medium ${
                    user.email_confirmed_at ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {user.email_confirmed_at ? '✓ Completed' : '⚠️ Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Profile Status:</span>
                  <span className="text-orange-600 font-medium">⏳ Awaiting Approval</span>
                </div>
                <div className="flex justify-between">
                  <span>Facebook Integration:</span>
                  <span className={`font-medium ${hasCompletedIntegrations ? 'text-green-600' : 'text-orange-600'}`}>
                    {hasCompletedIntegrations ? '✓ Completed' : '⚠️ Missing'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <Link href="/dashboard/profile">
                <Button className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Complete Profile Settings
                </Button>
              </Link>
              
              <p className="text-sm text-muted-foreground">
                For questions about the approval process:{' '}
                <a href="mailto:support@letify.cloud" className="text-primary hover:underline">
                  support@letify.cloud
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What Can You Do After Approval?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Automatically generate content from listing links</li>
              <li>• Share posts and reels on Facebook</li>
              <li>• Use analytics and reporting features</li>
              <li>• Quickly create content with Chrome Extension</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}