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
            Hesabın Admin Onayı Bekliyor
          </CardTitle>
          <CardDescription>
            Letify platformuna hoş geldin! Hesabın inceleme aşamasında.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Hesabın admin ekibimiz tarafından gözden geçiriliyor. 
              Bu işlem genellikle 24 saat içinde tamamlanır.
            </p>
          </div>

          {!hasCompletedIntegrations && (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <strong>Önemli:</strong> Admin onayını hızlandırmak için profil ayarlarını tamamlamanız önerilir. 
                Facebook entegrasyon bilgilerinizi ekleyerek onay sürecini kısaltabilirsiniz.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <User className="mr-2 h-5 w-5" />
                Hesap Durumu
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>E-posta:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>E-posta Doğrulama:</span>
                  <span className={`font-medium ${
                    user.email_confirmed_at ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {user.email_confirmed_at ? '✓ Tamamlandı' : '⚠️ Beklemede'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Profil Durumu:</span>
                  <span className="text-orange-600 font-medium">⏳ Onay Bekliyor</span>
                </div>
                <div className="flex justify-between">
                  <span>Facebook Entegrasyonu:</span>
                  <span className={`font-medium ${hasCompletedIntegrations ? 'text-green-600' : 'text-orange-600'}`}>
                    {hasCompletedIntegrations ? '✓ Tamamlandı' : '⚠️ Eksik'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <Link href="/dashboard/profile">
                <Button className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Profil Ayarlarını Tamamla
                </Button>
              </Link>
              
              <p className="text-sm text-muted-foreground">
                Onay süreciyle ilgili sorularınız için:{' '}
                <a href="mailto:destek@letify.com" className="text-primary hover:underline">
                  destek@letify.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Onaylandıktan Sonra Neler Yapabileceksin?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• İlan linklerinden otomatik içerik üretme</li>
              <li>• Facebook'ta post ve reels paylaşma</li>
              <li>• Analytics ve raporlama özelliklerini kullanma</li>
              <li>• Chrome Extension ile hızlı içerik üretme</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}