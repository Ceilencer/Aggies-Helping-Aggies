import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // --- FIX START ---
  // Only try to get the user if a session cookie actually exists.
  // This prevents the "Refresh Token Not Found" error on initial loads/callbacks.
  let user = null;
  const cookieStore = request.cookies.getAll();
  // Supabase cookies usually start with 'sb-' or contain the project ID. 
  // A simple check is to see if ANY cookies exist, or specifically look for the auth token.
  // But generally, we can just silence the error by checking result.error
  const { data, error } = await supabase.auth.getUser()
  if (!error) {
    user = data.user
  }
  // --- FIX END ---

  const pathname = request.nextUrl.pathname

  // PROTECTED ROUTES — require authentication
  const protectedPrefixes = ['/dashboard', '/verification-questionnaire', '/pending-approval']
  if (protectedPrefixes.some((p) => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // AUTH ROUTES LOGIC
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // HOMEPAGE LOGIC - Redirect to dashboard if authenticated
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