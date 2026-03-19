import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const supabase = await createClient()
  await supabase.auth.signOut()
  const redirectTo = searchParams.get('reason') === 'suspended'
    ? `${origin}/?suspended=true`
    : `${origin}/`
  return NextResponse.redirect(redirectTo)
}
