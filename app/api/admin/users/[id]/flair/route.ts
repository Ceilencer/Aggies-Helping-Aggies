import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { adminFlairUpdateSchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = adminFlairUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid flair value' }, { status: 400 })
    }
    const { flair } = validation.data

    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ flair })
      .eq('id', id)
      .select('id, flair')
      .single()

    if (updateError) {
      console.error('Error updating flair:', updateError)
      return NextResponse.json({ error: 'Failed to update flair' }, { status: 500 })
    }

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Error in flair update API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
