import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/utils/api-auth'

// GET /api/admin/analytics?days=30
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdminUser(supabase)
  if ('error' in admin) return admin.error

  const days = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10) || 30, 7),
    90
  )

  const service = createServiceClient()

  const [snapshotResult, dailyResult] = await Promise.all([
    service.rpc('admin_get_snapshot'),
    service.rpc('admin_get_daily_counts', { days_back: days }),
  ])

  if (snapshotResult.error) {
    console.error('Analytics snapshot error:', snapshotResult.error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
  if (dailyResult.error) {
    console.error('Analytics daily error:', dailyResult.error)
    return NextResponse.json({ error: 'Failed to load daily trends' }, { status: 500 })
  }

  return NextResponse.json({
    snapshot: snapshotResult.data,
    daily: dailyResult.data,
  })
}
