'use client'

import { useState } from 'react'
import ClientOnly from 'app/components/ClientOnly';
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
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      if (data.user) {
        toast({
          title: 'Signed in!',
          description: 'You have successfully signed in.',
        });
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast({
        title: 'Sign in failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

    return (
      <ClientOnly>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
          <Card className="w-full max-w-md shadow-md">
            <CardHeader>
              <CardTitle className="text-center">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <span suppressHydrationWarning>
                    {loading ? 'Checking...' : 'Sign In'}
                  </span>
                </Button>
              </form>
              <p className="mt-4 text-center text-sm">
                Don&apos;t have an account?{' '}
                <Link className="text-purple-700 underline" href="/sign-up">
                  Sign Up
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </ClientOnly>
  );
}