import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/cron/expire-posts
// Called nightly by Vercel cron (see vercel.json).
// Hard-deletes posts older than 14 days. Posts are shown an expiry countdown
// in the UI so users are aware their posts have a 2-week lifespan.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await service
    .from('posts')
    .delete()
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    console.error('[cron/expire-posts] Failed to delete expired posts:', error)
    return NextResponse.json({ error: 'Failed to delete expired posts' }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[cron/expire-posts] Deleted ${count} expired post(s)`)
  return NextResponse.json({ deleted: count })
}
