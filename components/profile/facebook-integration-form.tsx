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
          <Facebook className="h-5 w-5 text-purple-600" />
          <span>Facebook Integration</span>
        </CardTitle>
        <CardDescription>
          Enter the required information to enable automatic sharing on your Facebook page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This information is stored encrypted and only used for Facebook API requests.
            Fill in all fields to speed up admin approval.
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
              The unique ID number of your Facebook page
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
              The access token used to share on your page
            </p>
          </div>

          {/* Facebook App Secret alanı kaldırıldı */}

          <Button type="submit" disabled={isLoading} className="w-full bg-purple-500 hover:bg-purple-600 text-white">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {integrations ? 'Update Integration' : 'Save Integration'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">How to get this information?</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Create an app in Facebook Developer Console</li>
            <li>• Get a Page Access Token for your page</li>
            <li>• Copy the App Secret from your app settings</li>
            <li>• Get the Page ID from your page's "About" section</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}