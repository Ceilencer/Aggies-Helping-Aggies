import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/lib/types'

const ALLOWED_ROLES: UserRole[] = ['Personal', 'Business', 'Charity', 'Admin']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const role = body?.role as UserRole | undefined

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: actorProfile, error: actorProfileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (actorProfileError || !actorProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (actorProfile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Error in account type update API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
