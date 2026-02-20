import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { rollingAdminNoteUpsertSchema } from '@/lib/validations'

async function requireAdmin() {
  const supabase = await createClient()
  const admin = await requireAdminUser(supabase)
  if ('error' in admin) {
    return { supabase, error: admin.error }
  }

  return { supabase, user: admin.user }
}

export async function GET(request: NextRequest) {
  try {
    const adminContext = await requireAdmin()
    if ('error' in adminContext) return adminContext.error

    const { supabase } = adminContext

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 })
    }

    const { data: notes, error } = await supabase
      .from('admin_notes')
      .select(`
        *,
        creator:created_by(id, full_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    return NextResponse.json(notes?.[0] || null)
  } catch (error) {
    console.error('Error fetching rolling admin note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminContext = await requireAdmin()
    if ('error' in adminContext) return adminContext.error

    const { supabase, user } = adminContext

    const body = await request.json()
    const validation = rollingAdminNoteUpsertSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const { user_id, content } = validation.data

    const normalizedContent = String(content).trim()

    const { data: existingNotes, error: existingError } = await supabase
      .from('admin_notes')
      .select('id, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    if (existingError) throw existingError

    let savedNoteId: string

    if (!existingNotes || existingNotes.length === 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('admin_notes')
        .insert({
          user_id,
          created_by: user.id,
          content: normalizedContent,
        })
        .select('id')
        .single()

      if (insertError || !inserted) throw insertError || new Error('Failed to create note')
      savedNoteId = inserted.id
    } else {
      const primaryId = existingNotes[0].id

      const { error: updateError } = await supabase
        .from('admin_notes')
        .update({ content: normalizedContent })
        .eq('id', primaryId)

      if (updateError) throw updateError

      const duplicateIds = existingNotes.slice(1).map((note) => note.id)
      if (duplicateIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('admin_notes')
          .delete()
          .in('id', duplicateIds)

        if (deleteError) throw deleteError
      }

      savedNoteId = primaryId
    }

    const { data: savedNote, error: savedNoteError } = await supabase
      .from('admin_notes')
      .select(`
        *,
        creator:created_by(id, full_name, avatar_url)
      `)
      .eq('id', savedNoteId)
      .single()

    if (savedNoteError) throw savedNoteError

    return NextResponse.json(savedNote)
  } catch (error) {
    console.error('Error saving rolling admin note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
