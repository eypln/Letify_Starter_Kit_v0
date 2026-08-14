import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isDiagnosticRoute } from '@/lib/api/diagnostic-routes'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // CRITICAL: Return IMMEDIATELY for static files - before ANY Supabase operations
  // This prevents 401 errors on manifest.json, service worker, and Next.js build files
  const isStaticFile = 
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/_next/') || // ALL Next.js internal files (static, image, data, etc)
    pathname.startsWith('/icons/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/api/n8n/') || // n8n webhooks
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|json|js|css|woff|woff2|ttf|eot)$/)
  
  if (isStaticFile) {
    return NextResponse.next()
  }

  const diagnosticRoute = isDiagnosticRoute(pathname)

  if (diagnosticRoute && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  // CRITICAL: Allow /auth/callback to proceed without auth checks
  // This is needed for email verification and OAuth flows
  if (pathname === '/auth/callback') {
    console.log('[Middleware] Allowing /auth/callback to proceed')
    return NextResponse.next()
  }
  
  // NOW create Supabase client - ONLY for non-PWA requests
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

  if (diagnosticRoute) {
    if (!user || !user.email_confirmed_at) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin' || profile.status === 'denied') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const url = request.nextUrl.clone()

  // Admin rotaları koruması
  if (pathname.startsWith('/admin')) {
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

    // Admin rolü kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }

    // Admin bile olsa reddedilmişse erişim engelle
    if (profile?.status === 'denied') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
  }

  // Teamleader rotaları koruması
  if (pathname.startsWith('/teamleader')) {
    if (!user) {
      url.pathname = '/sign-in'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    if (!user.email_confirmed_at) {
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'teamleader') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
    if (profile?.status === 'denied') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
  }

  // Manager rotaları koruması
  if (pathname.startsWith('/manager')) {
    if (!user) {
      url.pathname = '/sign-in'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    if (!user.email_confirmed_at) {
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'manager') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
    if (profile?.status === 'denied') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
  }

  // Boss rotaları koruması
  if (pathname.startsWith('/boss')) {
    if (!user) {
      url.pathname = '/sign-in'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    if (!user.email_confirmed_at) {
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'boss') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
    if (profile?.status === 'denied') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
  }

  // Intern rotaları koruması
  if (pathname.startsWith('/intern')) {
    if (!user) {
      url.pathname = '/sign-in'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
    if (!user.email_confirmed_at) {
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'intern') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
    if (profile?.status === 'denied') {
      url.pathname = '/access-denied'
      return NextResponse.redirect(url)
    }
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

    // Profil yoksa (trigger başarısız olduysa) waiting-approval'a yönlendir
    if (!profile) {
      url.pathname = '/waiting-approval'
      return NextResponse.redirect(url)
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

  // Auth sayfalarına giriş yapmış kullanıcı erişmeye çalışırsa uygun sayfaya yönlendir
  // REMOVED: Automatic redirect is now handled client-side to allow users to sign out/switch accounts
  // Users can now access sign-in page even when authenticated

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/ (all Next.js internal files: static, image, data, webpack-hmr, etc)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js, workbox files (service worker)
     * - icons/ (PWA icons)
     * - robots.txt, sitemap.xml (SEO files)
     * - api/n8n/ (webhook endpoints)
     * - Static file extensions (.js, .css, .json, .png, .jpg, .svg, etc)
     */
    '/((?!_next|favicon\\.ico|manifest\\.json|sw\\.js|workbox-|icons|robots\\.txt|sitemap\\.xml|api/n8n).*)',
  ],
}