import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import type { AdminReportedGroupDTO, AdminReportSummaryDTO } from '@/lib/types'

// Supabase returns joined rows as arrays even for single-record joins — unwrap them
function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null
  if (Array.isArray(val)) return val[0] ?? null
  return val
}

function normalizePost(raw: any) {
  if (!raw) return null
  const row = unwrap<any>(raw)
  if (!row) return null
  return {
    id: row.id as string,
    title: row.title as string | undefined,
    content: row.content as string | undefined,
    profiles: unwrap<{ id: string; full_name?: string }>(row.profiles),
  }
}

function normalizeComment(raw: any) {
  if (!raw) return null
  const row = unwrap<any>(raw)
  if (!row) return null
  return {
    id: row.id as string,
    content: row.content as string | undefined,
    profiles: unwrap<{ id: string; full_name?: string }>(row.profiles),
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    const searchParams = request.nextUrl.searchParams
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 100)
    const filter = searchParams.get('filter') || 'unresolved'
    const type = searchParams.get('type') || ''

    // Fetch up to 1000 reports and group in JS — fine for typical moderation volumes
    let query = supabase
      .from('reports')
      .select(`
        id,
        report_type,
        reason,
        description,
        is_resolved,
        resolution_action,
        created_at,
        post_id,
        comment_id,
        reporter:profiles!reported_by(id, full_name),
        posts(id, title, content, profiles!posts_author_id_fkey(id, full_name)),
        comments(id, content, profiles!comments_author_id_fkey(id, full_name))
      `)
      .limit(1000)

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

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }

    // Group reports by content item
    const groupMap = new Map<string, AdminReportedGroupDTO>()

    for (const report of data ?? []) {
      const key =
        report.report_type === 'post'
          ? `post:${report.post_id}`
          : `comment:${report.comment_id}`

      const contentId =
        report.report_type === 'post' ? report.post_id : report.comment_id

      if (!contentId) continue

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          content_type: report.report_type,
          content_id: contentId,
          report_count: 0,
          latest_report_at: report.created_at,
          is_resolved: report.is_resolved,
          resolution_action: report.resolution_action ?? null,
          post: normalizePost(report.posts),
          comment: normalizeComment(report.comments),
          reports: [],
        })
      }

      const group = groupMap.get(key)!
      group.report_count++

      const summary: AdminReportSummaryDTO = {
        id: report.id,
        reason: report.reason,
        description: report.description ?? null,
        created_at: report.created_at,
        reporter: unwrap<{ id: string; full_name?: string }>(report.reporter),
      }
      group.reports.push(summary)

      if (report.created_at > group.latest_report_at) {
        group.latest_report_at = report.created_at
      }
    }

    // Sort groups: most recently reported first
    const groups = Array.from(groupMap.values()).sort(
      (a, b) => b.latest_report_at.localeCompare(a.latest_report_at)
    )

    const total = groups.length
    const page = groups.slice(offset, offset + limit)

    return NextResponse.json({ data: page, total })
  } catch (error) {
    console.error('Error in admin reports endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    const { contentType, contentId, action } = await request.json()

    if (!contentType || !contentId || !action) {
      return NextResponse.json(
        { error: 'contentType, contentId and action are required' },
        { status: 400 }
      )
    }

    if (!['post', 'comment'].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 })
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

    // If delete, remove the content
    if (action === 'delete') {
      const table = contentType === 'post' ? 'posts' : 'comments'
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', contentId)

      if (deleteError) {
        console.error(`Error deleting ${contentType}:`, deleteError)
        return NextResponse.json(
          { error: `Failed to delete ${contentType}: ${deleteError.message}` },
          { status: 500 }
        )
      }
    }

    // Resolve ALL unresolved reports for this content item at once
    const contentColumn = contentType === 'post' ? 'post_id' : 'comment_id'
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        is_resolved: true,
        resolution_action: action,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq(contentColumn, contentId)
      .eq('is_resolved', false)

    if (updateError) {
      console.error('Error resolving reports:', updateError)
      return NextResponse.json({ error: 'Failed to resolve reports' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in admin reports endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
