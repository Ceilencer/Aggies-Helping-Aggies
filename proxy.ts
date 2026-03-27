import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Generate a unique nonce for this request.
  // This is used in the Content-Security-Policy header to allow only
  // scripts/styles that carry this nonce, removing the need for 'unsafe-inline'.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' allows scripts loaded by a nonce-trusted script to run,
    // which is required for Next.js lazy-loaded chunks and Google Sign-In.
    // 'unsafe-eval' is only added in development for hot-reloading.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com https://*.supabase.co${isDev ? " 'unsafe-eval'" : ''}`,
    // 'unsafe-inline' for styles is kept — Tailwind and next-themes require it,
    // and CSS-based attacks are much less severe than script injection.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.googleusercontent.com https://*.supabase.co https://*.fbcdn.net https://*.facebook.com",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://*.facebook.com https://*.fbcdn.net",
    "frame-src 'self' https://accounts.google.com https://*.facebook.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')

  // Inject the nonce into request headers so layout server components can read
  // it via headers() and pass it to scripts/ThemeProvider.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Preserve the nonce in request headers when the response is recreated
          // for cookie refresh, otherwise the layout loses access to it.
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Only call getUser() when a Supabase session cookie is actually present.
  // Calling it without a session triggers a network round-trip that always
  // fails with "Refresh Token Not Found" and logs an AuthApiError to the console.
  const hasSbCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  let user = null
  if (hasSbCookie) {
    const { data, error } = await supabase.auth.getUser()
    if (!error) {
      user = data.user
    }
  }

  const pathname = request.nextUrl.pathname

  // PROTECTED ROUTES — require authentication
  const protectedPrefixes = ['/dashboard', '/verification-questionnaire', '/pending-approval', '/collect-email']
  if (protectedPrefixes.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url))
      redirectResponse.headers.set('Content-Security-Policy', csp)
      return redirectResponse
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname === '/login' && user) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    redirectResponse.headers.set('Content-Security-Policy', csp)
    return redirectResponse
  }

  if (pathname === '/' && user && !request.nextUrl.searchParams.has('suspended')) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    redirectResponse.headers.set('Content-Security-Policy', csp)
    return redirectResponse
  }

  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/signout).*)',
  ],
}
