import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const admin = await requireAdminUser(supabase)
  if ('error' in admin) return admin.error

  const { id: userId } = await params

  try {
    const { data: ban, error } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Fetch ban error:', error)
      return NextResponse.json({ error: 'Failed to fetch ban info' }, { status: 500 })
    }

    return NextResponse.json({ data: ban })
  } catch (error) {
    console.error('Fetch ban error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
