import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function POST(request: Request) {
  const supabase = await createClient()

  const admin = await requireAdminUser(supabase)
  if ('error' in admin) return admin.error

  const body = await request.json()
  const { userId } = body as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId })

  if (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
