import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const flairSchema = z.object({
  flair: z.enum(['Student', 'Former Student', 'Family Member', 'Aggie Mom', 'Faculty', 'BCS Local']),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = flairSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid flair value' }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .update({ flair: parsed.data.flair, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flair: parsed.data.flair })
}
