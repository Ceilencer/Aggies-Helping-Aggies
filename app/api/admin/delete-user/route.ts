import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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

  // admin_delete_user is SECURITY DEFINER; call it via the service-role client
  // so EXECUTE can be revoked from anon/authenticated (admin already verified).
  const service = createServiceClient()
  const { error } = await service.rpc('admin_delete_user', { p_user_id: userId })

  if (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
