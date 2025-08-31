'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { IntegrationFormSchema, type IntegrationFormData } from '@/lib/validation'
import { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Facebook, Info } from 'lucide-react'
import { upsertIntegration } from './actions'

type UserIntegrations = Database['public']['Tables']['users_integrations']['Row']

interface FacebookIntegrationFormProps {
  integrations: UserIntegrations | null
}

export default function FacebookIntegrationForm({ integrations }: FacebookIntegrationFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IntegrationFormData>({
    resolver: zodResolver(IntegrationFormSchema),
    defaultValues: {
      fb_page_id: integrations?.fb_page_id || '',
      fb_access_token: integrations?.fb_access_token || '',
      fb_app_secret: integrations?.fb_app_secret || '',
    },
  })

  const onSubmit = async (data: IntegrationFormData) => {
    setIsLoading(true)

    try {
      const result = await upsertIntegration(data)
      
      if (result.success) {
        toast({
          title: 'Başarılı',
          description: 'Facebook entegrasyon bilgileriniz kaydedildi.',
        })
      } else {
        toast({
          title: 'Hata',
          description: result.error || 'Bir hata oluştu. Lütfen tekrar deneyiniz.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Bir hata oluştu. Lütfen tekrar deneyiniz.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          <span>Facebook Entegrasyonu</span>
        </CardTitle>
        <CardDescription>
          Facebook sayfanızda otomatik paylaşım yapmak için gerekli bilgileri girin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Bu bilgiler şifrelenmiş olarak saklanır ve yalnızca Facebook API istekleri için kullanılır.
            Admin onayını hızlandırmak için tüm alanları doldurun.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb_page_id">Facebook Page ID *</Label>
            <Input
              id="fb_page_id"
              placeholder="123456789012345"
              {...register('fb_page_id')}
              disabled={isLoading}
            />
            {errors.fb_page_id && (
              <p className="text-sm text-red-600">{errors.fb_page_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Facebook sayfanızın benzersiz kimlik numarası
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb_access_token">Facebook Access Token *</Label>
            <Input
              id="fb_access_token"
              type="password"
              placeholder="EAAB..."
              {...register('fb_access_token')}
              disabled={isLoading}
            />
            {errors.fb_access_token && (
              <p className="text-sm text-red-600">{errors.fb_access_token.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Sayfanıza paylaşım yapmak için kullanılan erişim anahtarı
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb_app_secret">Facebook App Secret *</Label>
            <Input
              id="fb_app_secret"
              type="password"
              placeholder="abc123..."
              {...register('fb_app_secret')}
              disabled={isLoading}
            />
            {errors.fb_app_secret && (
              <p className="text-sm text-red-600">{errors.fb_app_secret.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Facebook uygulamanızın gizli anahtarı
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {integrations ? 'Entegrasyonu Güncelle' : 'Entegrasyonu Kaydet'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Bu Bilgileri Nasıl Alırım?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Facebook Developer Console'dan uygulama oluşturun</li>
            <li>• Sayfanız için Page Access Token alın</li>
            <li>• App Secret'ı uygulama ayarlarından kopyalayın</li>
            <li>• Page ID'yi sayfanızın "Hakkında" bölümünden alın</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}