import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = parseInt(searchParams.get('limit') || '15', 10)
    const filter = searchParams.get('filter') || 'unresolved' // 'unresolved', 'resolved', 'all'
    const type = searchParams.get('type') || '' // 'post', 'comment', or empty for both

    // Build query
    let query = supabase
      .from('reports')
      .select(
        `
        id,
        report_type,
        reason,
        description,
        is_resolved,
        resolution_action,
        created_at,
        reported_by,
        post_id,
        comment_id,
        resolved_by,
        resolved_at,
        profiles!reported_by(id, full_name, avatar_url),
        posts(id, title, content, author_id, channel_id, profiles!posts_author_id_fkey(id, full_name, avatar_url)),
        comments(id, content, post_id, author_id, profiles!comments_author_id_fkey(id, full_name, avatar_url))
        `,
        { count: 'exact' }
      )

    // Apply filters
    if (filter === 'unresolved') {
      query = query.eq('is_resolved', false)
    } else if (filter === 'resolved') {
      query = query.eq('is_resolved', true)
    }

    if (type === 'post') {
      query = query.eq('report_type', 'post')
    } else if (type === 'comment') {
      query = query.eq('report_type', 'comment')
    }

    // Apply pagination and sorting
    const { data, error, count } = await query
      .order('is_resolved', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
    })
  } catch (error) {
    console.error('Error in admin reports endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    const { reportId, action } = await request.json()

    if (!reportId || !action) {
      return NextResponse.json(
        { error: 'reportId and action are required' },
        { status: 400 }
      )
    }

    if (!['delete', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "delete" or "dismiss"' },
        { status: 400 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // If delete action, delete the post or comment
    if (action === 'delete') {
      if (report.report_type === 'post' && report.post_id) {
        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', report.post_id)

        if (deleteError) {
          console.error('Error deleting post:', deleteError)
          return NextResponse.json(
            { error: `Failed to delete post: ${deleteError.message}` },
            { status: 500 }
          )
        }
      } else if (report.report_type === 'comment' && report.comment_id) {
        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('id', report.comment_id)

        if (deleteError) {
          console.error('Error deleting comment:', deleteError)
          return NextResponse.json(
            { error: `Failed to delete comment: ${deleteError.message}` },
            { status: 500 }
          )
        }
      }
    }

    // Mark report as resolved
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({
        is_resolved: true,
        resolution_action: action,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating report:', updateError)
      return NextResponse.json(
        { error: 'Failed to resolve report' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Report ${action}ed successfully`,
      report: updatedReport,
    })
  } catch (error) {
    console.error('Error in admin reports endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
