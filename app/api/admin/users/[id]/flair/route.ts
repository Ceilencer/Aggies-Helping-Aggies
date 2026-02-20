import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { FlairType } from '@/lib/types'

const ALLOWED_FLAIRS: FlairType[] = [
  'Student',
  'Former Student',
  'Parent',
  'Faculty',
  'BCS Local',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const flair = body?.flair as FlairType | undefined

    if (!flair || !ALLOWED_FLAIRS.includes(flair)) {
      return NextResponse.json({ error: 'Invalid flair value' }, { status: 400 })
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
