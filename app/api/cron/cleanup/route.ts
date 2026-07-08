import { NextResponse } from 'next/server'
import { type User } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/cron/cleanup
// Called daily by Vercel cron (see vercel.json).
// Deletes auth users who signed in via OAuth but never submitted a
// verification questionnaire, and cleans up abandoned VRs older than 30 days.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Find auth users created more than 24h ago with no profile and no VR.
  // These are people who OAuth'd but abandoned the process entirely.
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Fetch ALL auth users. Supabase returns at most `perPage` per call, so we
  // must page through until a short page signals the end — otherwise users
  // beyond the first page are never considered for cleanup.
  const perPage = 1000
  const authUsers: User[] = []
  for (let page = 1; ; page++) {
    const { data, error: listError } = await service.auth.admin.listUsers({ page, perPage })
    if (listError) {
      console.error('[cron/cleanup] Failed to list auth users:', listError)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }
    authUsers.push(...data.users)
    if (data.users.length < perPage) break
  }

  // Filter to users created before the cutoff
  const oldUsers = (authUsers ?? []).filter(
    (u) => u.created_at && u.created_at < cutoff24h
  )

  if (oldUsers.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  const oldUserIds = oldUsers.map((u) => u.id)

  // Find which of these have a profile (approved) or a VR (pending)
  const [profilesResult, vrsResult] = await Promise.all([
    service.from('profiles').select('id').in('id', oldUserIds),
    service.from('verification_requests').select('user_id').in('user_id', oldUserIds),
  ])

  const withProfile = new Set((profilesResult.data ?? []).map((p: any) => p.id))
  const withVR = new Set((vrsResult.data ?? []).map((v: any) => v.user_id))

  // Abandoned = no profile AND no VR
  const abandoned = oldUsers.filter(
    (u) => !withProfile.has(u.id) && !withVR.has(u.id)
  )

  if (abandoned.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  const results = await Promise.allSettled(
    abandoned.map((u) => service.auth.admin.deleteUser(u.id))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  if (failed > 0) {
    console.error(`[cron/cleanup] ${failed} deletion(s) failed out of ${abandoned.length}`)
  }

  console.log(`[cron/cleanup] Deleted ${succeeded} abandoned account(s)`)
  return NextResponse.json({ deleted: succeeded, failed })
}
