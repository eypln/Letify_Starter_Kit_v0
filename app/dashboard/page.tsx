import { getUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, BarChart3, FileText, Users, Settings } from 'lucide-react'
import { ExpiredBannerFromQuery } from '@/components/ui/ToastBanner'

export default async function DashboardPage() {
  const user = await getUser()
  const profile = await getProfile()

  if (!user) {
    redirect('/sign-in')
  }

  if (!profile) {
    redirect('/sign-in')
  }

  return (
    <>
      <ExpiredBannerFromQuery />
      <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Hoş geldin, {user.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Letify platformunda içerik üretmeye hazır mısın?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/new-post">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-6 w-6 text-primary" />
                <span>Yeni Post Oluştur</span>
              </CardTitle>
              <CardDescription>
                İlan linkinden otomatik içerik üret ve Facebook'ta paylaş
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Başlat
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/listings">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-green-600" />
                <span>İlanlar</span>
              </CardTitle>
              <CardDescription>
                Oluşturduğun içerikleri ve paylaşımları görüntüle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                Görüntüle
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/analytics">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <span>Analytics</span>
              </CardTitle>
              <CardDescription>
                Paylaşım performansını ve istatistiklerini incele
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                İncele
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/clients">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-purple-600" />
                <span>Müşteriler</span>
              </CardTitle>
              <CardDescription>
                Müşteri yönetimi ve raporlama (yakında)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full" disabled>
                Yakında
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/subscription">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-orange-600" />
                <span>Abonelik</span>
              </CardTitle>
              <CardDescription>
                Plan yönetimi ve fatura bilgileri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                Yönet
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/profile">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-6 w-6 text-gray-600" />
                <span>Profil</span>
              </CardTitle>
              <CardDescription>
                Hesap ayarları ve Facebook entegrasyonu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Ayarlar
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hızlı İstatistikler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bu Ay Paylaşım:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam İlan:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aktif Entegrasyon:</span>
                <span className="font-medium">Facebook</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Henüz aktivite yok. İlk içeriğinizi oluşturmaya başlayın!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}