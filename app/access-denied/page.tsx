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
            Erişim Reddedildi
          </CardTitle>
          <CardDescription>
            Hesabınızın Letify platformuna erişimi reddedilmiştir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Hesabınız admin ekibimiz tarafından incelendi ancak şu anda platformumuza uygun bulunmadı.
            </p>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                Bu karar hakkında daha fazla bilgi almak veya itirazda bulunmak için 
                destek ekibimizle iletişime geçebilirsiniz.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <a 
              href="mailto:destek@letify.com?subject=Hesap Erişimi Hakkında" 
              className="block"
            >
              <Button className="w-full">
                Destek Ekibiyle İletişime Geç
              </Button>
            </a>
            
            <Link href="/sign-in">
              <Button variant="outline" className="w-full">
                Giriş Sayfasına Dön
              </Button>
            </Link>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              Hesap durumunuz değiştiğinde e-posta ile bilgilendirileceksiniz.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}