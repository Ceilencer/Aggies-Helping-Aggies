import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          response = NextResponse.next({ request })
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
  const protectedPrefixes = ['/dashboard', '/verification-questionnaire', '/pending-approval']
  if (protectedPrefixes.some((p) => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname === '/' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}
