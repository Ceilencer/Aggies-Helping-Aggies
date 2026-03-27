import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireAdminUser(supabase)
  if ('error' in auth) return auth.error

  const service = createServiceClient()
  const { data, error } = await service
    .from('ring_sponsorship_applications')
    .select('id, full_name, email, credit_hours, ring_type, story, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Ring sponsorship fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch applications.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
