import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/utils/api-auth'

const PAGE_SIZE = 50

// GET /api/admin/analytics/action-log?offset=0
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdminUser(supabase)
  if ('error' in admin) return admin.error

  const offset = Math.max(parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10) || 0, 0)

  const service = createServiceClient()
  const { data, error } = await service.rpc('admin_get_action_log', {
    page_offset: offset,
    page_limit: PAGE_SIZE,
  })

  if (error) {
    console.error('Action log error:', error)
    return NextResponse.json({ error: 'Failed to load action log' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [], hasMore: (data ?? []).length === PAGE_SIZE })
}
