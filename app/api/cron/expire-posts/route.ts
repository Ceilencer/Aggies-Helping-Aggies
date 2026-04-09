import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { deletePostImages } from '@/lib/utils/deletePostImages'

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
  const now = new Date().toISOString()

  // Fetch expired post IDs before deleting so we can clean up storage
  const { data: expiredPosts, error: fetchError } = await service
    .from('posts')
    .select('id')
    .lt('expires_at', now)

  if (fetchError) {
    console.error('[cron/expire-posts] Failed to fetch expired posts:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch expired posts' }, { status: 500 })
  }

  if (!expiredPosts || expiredPosts.length === 0) {
    console.log('[cron/expire-posts] No expired posts found')
    return NextResponse.json({ deleted: 0 })
  }

  const ids = expiredPosts.map((p) => p.id)

  // Delete the post rows
  const { error: deleteError } = await service
    .from('posts')
    .delete()
    .in('id', ids)

  if (deleteError) {
    console.error('[cron/expire-posts] Failed to delete expired posts:', deleteError)
    return NextResponse.json({ error: 'Failed to delete expired posts' }, { status: 500 })
  }

  // Clean up storage for each deleted post (errors logged, not fatal)
  await Promise.all(ids.map((id) => deletePostImages(service, id)))

  console.log(`[cron/expire-posts] Deleted ${ids.length} expired post(s) and cleaned up storage`)
  return NextResponse.json({ deleted: ids.length })
}
