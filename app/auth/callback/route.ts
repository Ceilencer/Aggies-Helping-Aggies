import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('🔴 Supabase Auth Error:', error)
    }
    
    if (!error && data.user) {
      // Check if user has TAMU email
      const email = data.user.email || ''
      if (!email.endsWith('@tamu.edu') && !email.endsWith('@aggienetwork.com')) {
        // Sign out non-TAMU users
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=invalid_email`)
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // Create profile if it doesn't exist
      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
            role: 'Personal',
            is_verified: true,
            is_alumni: email.endsWith('@aggienetwork.com'),
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
