import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reason, description } = await request.json()

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      )
    }

    if (reason.length < 5 || reason.length > 100) {
      return NextResponse.json(
        { error: 'Reason must be between 5 and 100 characters' },
        { status: 400 }
      )
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json({ error: 'Description must be a string' }, { status: 400 })
      }
      if (description.length > 500) {
        return NextResponse.json(
          { error: 'Description must be 500 characters or fewer' },
          { status: 400 }
        )
      }
    }

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', id)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check if user already reported this comment
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('comment_id', id)
      .eq('reported_by', user.id)
      .eq('is_resolved', false)
      .single()

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this comment' },
        { status: 409 }
      )
    }

    // Create report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        report_type: 'comment',
        comment_id: id,
        reported_by: user.id,
        reason,
        description: description || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Report submitted successfully', report },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error reporting comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
