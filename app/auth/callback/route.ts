import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('🔴 Supabase Auth Error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const email = data.user.email || ''
  const avatarUrl =
    data.user.user_metadata?.avatar_url ||
    data.user.user_metadata?.picture ||
    null

  if (!email.endsWith('@tamu.edu') && !email.endsWith('@aggienetwork.com')) {
    // Redirect first, sign out AFTER redirect completes
    const response = NextResponse.redirect(
      `${origin}/login?error=invalid_email`
    )
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    return response
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single()

  if (!existingProfile) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      full_name:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        '',
      avatar_url: avatarUrl,
      role: 'Personal',
      is_verified: true,
      is_alumni: email.endsWith('@aggienetwork.com'),
    })

    if (profileError) {
      console.error('Profile creation error:', profileError)
    }
  }

  const profileUpdates: Record<string, string> = {
    last_login: new Date().toISOString(),
  }

  if (avatarUrl) {
    profileUpdates.avatar_url = avatarUrl
  }

  const { error: lastLoginError } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', data.user.id)

  if (lastLoginError) {
    console.warn('Failed to update last login:', lastLoginError.message)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
