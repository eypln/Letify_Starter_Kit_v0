'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== password2) {
      toast({ title: 'Şifreler uyuşmuyor', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const redirectTo =
        (process.env.NEXT_PUBLIC_WEBAPP_URL || 'http://localhost:3000') + '/auth/callback'
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      })
      if (error) throw error
      toast({ title: 'Kayıt başarılı', description: 'E-postana doğrulama linki gönderdik.' })
    } catch (err: any) {
      console.error('signUp error:', err)
      toast({ title: 'Kayıt hatası', description: String(err.message || err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-center">Letify&apos;e Kayıt Ol</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
              <Label htmlFor="pw">Şifre</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <Label htmlFor="pw2">Şifre Tekrar</Label>
              <Input
                id="pw2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Gönderiliyor...' : 'Kayıt Ol'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            Zaten hesabın var mı?{' '}
            <Link className="text-blue-600 underline" href="/sign-in">
              Giriş Yap
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}