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

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Rate limit: max 5 reports per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('reported_by', user.id)
      .gte('created_at', oneHourAgo)

    if ((recentCount ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'You are submitting reports too quickly. Please wait before reporting again.' },
        { status: 429 }
      )
    }

    // Check if user already reported this post
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('post_id', id)
      .eq('reported_by', user.id)
      .eq('is_resolved', false)
      .single()

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this post' },
        { status: 409 }
      )
    }

    // Create report
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        report_type: 'post',
        post_id: id,
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
    console.error('Error reporting post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
