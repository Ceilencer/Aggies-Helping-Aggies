import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { adminNoteCreateSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    // Get user_id from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 })
    }

    // Fetch admin notes for the user
    const { data: notes, error } = await supabase
      .from('admin_notes')
      .select(`
        *,
        creator:created_by(id, full_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching admin notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    const { user } = admin

    const body = await request.json()
    const validation = adminNoteCreateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    const { user_id, content } = validation.data

    // Create admin note
    const { data: note, error } = await supabase
      .from('admin_notes')
      .insert({
        user_id,
        created_by: user.id,
        content,
      })
      .select(`
        *,
        creator:created_by(id, full_name, avatar_url)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error creating admin note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
