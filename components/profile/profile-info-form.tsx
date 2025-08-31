'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { updateProfile } from './actions'
import { useToast } from '@/components/ui/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User as UserIcon, Save } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ProfileInfoFormProps {
  user: User
  profile: Profile
}

export default function ProfileInfoForm({ user, profile }: ProfileInfoFormProps) {
  const { toast } = useToast()
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateProfile({
        full_name: fullName,
        phone: phone,
      })

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: 'Profil bilgileriniz güncellendi.',
        })
      } else {
        toast({
          title: 'Hata',
          description: result.error || 'Bir hata oluştu.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        title: 'Hata',
        description: 'Beklenmeyen bir hata oluştu.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5" />
          <span>Profil Bilgileri</span>
        </CardTitle>
        <CardDescription>
          Ad soyad ve telefon bilgilerinizi güncelleyebilirsiniz
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adınız ve soyadınız"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>{loading ? 'Güncelleniyor...' : 'Güncelle'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}