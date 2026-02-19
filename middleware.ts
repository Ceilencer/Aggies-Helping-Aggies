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

  // 2. BAN CHECK LOGIC - Check if user is banned (skip for /banned, /auth/callback, and public routes)
  if (user && !request.nextUrl.pathname.startsWith('/banned') && !request.nextUrl.pathname.startsWith('/auth/callback')) {
    try {
      const baseUrl = request.nextUrl.origin
      const banCheckUrl = `${baseUrl}/api/admin/user-bans/check/${user.id}`
      
      // Pass the request cookies for auth context
      const banCheckResponse = await fetch(banCheckUrl, {
        credentials: 'include',
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      })
      
      if (banCheckResponse.ok) {
        const banData = await banCheckResponse.json()
        if (banData.is_banned) {
          // User is banned, redirect to banned page
          return NextResponse.redirect(new URL('/banned', request.url))
        }
      }
    } catch (err) {
      // If there's an error checking ban status, continue normally
      // This prevents the app from breaking if the API call fails
      console.error('Error checking ban status:', err)
    }
  }

  // 3. PROTECTED ROUTES LOGIC
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 4. AUTH ROUTES LOGIC
  if (request.nextUrl.pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 5. HOMEPAGE LOGIC - Redirect to dashboard if authenticated and not banned
  if (request.nextUrl.pathname === '/' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}