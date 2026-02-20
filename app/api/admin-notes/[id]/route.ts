import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { adminNoteUpdateSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    const body = await request.json()
    const validation = adminNoteUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    const { content } = validation.data

    // Update admin note
    const { data: note, error } = await supabase
      .from('admin_notes')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        creator:created_by(id, full_name, avatar_url)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating admin note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    // Delete admin note
    const { error } = await supabase
      .from('admin_notes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting admin note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
