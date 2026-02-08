import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Create an initial response
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
        // 👇 FIXED: Added explicit type definition here
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

  // 2. Refresh the session (Vital for Server Components)
  const { data: { user } } = await supabase.auth.getUser()

  // 3. PROTECTED ROUTES LOGIC
  // If the user is trying to go to /dashboard...
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // ...and they are NOT logged in -> Redirect to Login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 4. AUTH ROUTES LOGIC
  // If the user is trying to go to /login...
  if (request.nextUrl.pathname === '/login') {
    // ...and they ARE logged in -> Redirect to Dashboard
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (The route that handles the code exchange)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}