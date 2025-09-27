import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Access Denied
          </CardTitle>
          <CardDescription>
            Your account has been denied access to the Letify platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Your account has been reviewed by our admin team but is currently not eligible for our platform.
            </p>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                If you would like more information about this decision or wish to appeal, you can contact our support team.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <a 
              href="mailto:support@letify.cloud?subject=Account Access Inquiry" 
              className="block"
            >
              <Button className="w-full">
                Contact Support Team
              </Button>
            </a>
            <Link href="/sign-in">
              <Button variant="outline" className="w-full">
                Return to Sign In Page
              </Button>
            </Link>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              You will be notified by email if your account status changes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}