import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // n8n status callback endpoint'ini auth kontrollerinden muaf tut
  if (pathname === '/api/n8n/status-callback') {
    return NextResponse.next()
  }

  // Dashboard rotaları koruması
  if (pathname.startsWith('/dashboard')) {
    // Kullanıcı giriş yapmamışsa sign-in'e yönlendir
    if (!user) {
      url.pathname = '/sign-in'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // E-posta doğrulanmamışsa verify-email sayfasına yönlendir
    if (!user.email_confirmed_at) {
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }

    // Profil bilgilerini al
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('user_id', user.id)
      .single()

    // Profil yoksa oluştur (fallback)
    if (!profile) {
      await supabase
        .from('profiles')
        .insert({ user_id: user.id, status: 'pending_admin', role: 'agent' })
      
      // Yeni oluşturulan profil pending_admin durumunda olacak
      if (pathname !== '/dashboard/profile' && pathname !== '/waiting-approval') {
        url.pathname = '/waiting-approval'
        return NextResponse.redirect(url)
      }
    }

    // Admin onayı bekleyen kullanıcılar
    if (profile?.status === 'pending_admin') {
      // /dashboard/profile her zaman erişilebilir (kullanıcı ayarlarını tamamlayabilsin)
      if (pathname === '/dashboard/profile') {
        return response
      }
      
      // Diğer protected rotalar için waiting-approval'a yönlendir
      const protectedRoutes = [
        '/dashboard/new-post',
        '/dashboard/listings', 
        '/dashboard/analytics',
        '/dashboard/subscription',
        '/dashboard/clients'
      ]
      
      if (protectedRoutes.some(route => pathname.startsWith(route))) {
        url.pathname = '/waiting-approval'
        return NextResponse.redirect(url)
      }
    }

    // Reddedilen kullanıcılar
    if (profile?.status === 'denied') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
  }

  // Auth sayfalarına giriş yapmış kullanıcı erişmeye çalışırsa dashboard'a yönlendir
  if ((pathname === '/sign-in' || pathname === '/sign-up') && user) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}