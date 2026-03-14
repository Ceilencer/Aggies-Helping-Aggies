import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { adminRoleUpdateSchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = adminRoleUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })
    }
    const { role } = validation.data

    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    // Fetch current role before updating so we can log the transition
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single()

    if (fetchError || !existingProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const previousRole = existingProfile.role

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('id, role')
      .single()

    if (updateError) {
      console.error('Error updating account type:', updateError)
      return NextResponse.json({ error: 'Failed to update account type' }, { status: 500 })
    }

    // Audit log — write to admin_notes so role changes are traceable
    await supabase.from('admin_notes').insert({
      user_id: id,
      created_by: admin.user.id,
      content: `Role changed from "${previousRole}" to "${role}".`,
    })

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Error in account type update API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
