import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const auth = await requireAdminUser(supabase)
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!body?.action) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const { action, denial_reason } = body
  if (action !== 'approve' && action !== 'deny') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  }

  const service = createServiceClient()
  const update: Record<string, string> = {
    status: action === 'approve' ? 'approved' : 'denied',
  }
  if (action === 'deny' && denial_reason?.trim()) {
    update.denial_reason = denial_reason.trim()
  }

  const { error } = await service
    .from('ring_sponsorship_applications')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('Ring sponsorship update error:', error)
    return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
