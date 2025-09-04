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
          title: 'Success',
          description: 'Your profile information has been updated.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'An error occurred.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
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
          <span>Profile Information</span>
        </CardTitle>
        <CardDescription>
          You can update your full name and phone number
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 555 5555"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white">
              <Save className="h-4 w-4" />
              <span>{loading ? 'Updating...' : 'Update'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}