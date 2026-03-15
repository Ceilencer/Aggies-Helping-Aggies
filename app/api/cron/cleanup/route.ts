import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/cron/cleanup
// Called daily by Vercel cron (see vercel.json).
// Deletes pending_approval profiles that never completed the verification
// questionnaire and are older than 24 hours.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Fetch pending_approval profiles older than 24h, including any verification requests
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, verification_requests!verification_requests_user_id_fkey(id)')
    .eq('account_status', 'pending_approval')
    .lt('created_at', cutoff)

  if (fetchError) {
    console.error('[cron/cleanup] Failed to fetch stale profiles:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  // Keep only profiles with no questionnaire submission
  const stale = (profiles ?? []).filter((p: any) => {
    const reqs = p.verification_requests
    return !reqs || (Array.isArray(reqs) && reqs.length === 0)
  })

  if (stale.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  // Delete each stale account via the existing admin RPC
  const results = await Promise.allSettled(
    stale.map((p: any) => supabase.rpc('admin_delete_user', { p_user_id: p.id }))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  if (failed > 0) {
    console.error(`[cron/cleanup] ${failed} deletion(s) failed out of ${stale.length}`)
  }

  console.log(`[cron/cleanup] Deleted ${succeeded} stale account(s)`)
  return NextResponse.json({ deleted: succeeded, failed })
}
