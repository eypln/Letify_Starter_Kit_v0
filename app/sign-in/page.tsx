'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignInPage() {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      console.log('Attempting login...') // Debug log
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      if (error) {
        console.error('Supabase auth error:', error) // Debug log
        throw error
      }
      
      console.log('Login successful, user:', data.user) // Debug log
      
      // Check if user exists and is authenticated
      if (data.user) {
        toast({ 
          title: 'Başarılı!', 
          description: 'Giriş yapıldı, dashboard\'a yönlendiriliyorsunuz...' 
        })
        
        // Small delay to let the authentication state propagate
        setTimeout(() => {
          router.push('/dashboard/profile') // Start with profile page first
          router.refresh() // Refresh to update server-side authentication state
        }, 500)
      }
    } catch (err: any) {
      console.error('signIn error:', err)
      toast({ 
        title: 'Giriş hatası', 
        description: String(err.message || 'Bir hata oluştu'), 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-center">Giriş Yap</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Kontrol ediliyor...' : 'Giriş Yap'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            Hesabın yok mu?{' '}
            <Link className="text-blue-600 underline" href="/sign-up">
              Kayıt Ol
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}