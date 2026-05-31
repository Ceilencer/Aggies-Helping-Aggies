import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/utils/api-auth'
import { validateReportInput, checkReportRateLimit } from '@/lib/utils/reports'
import { notifyNewReport } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const auth = await requireAuthenticatedUser(supabase)
    if ('error' in auth) return auth.error
    const { user } = auth

    const { reason, description } = await request.json()

    const inputError = validateReportInput(reason, description)
    if (inputError) return inputError

    const rateLimitError = await checkReportRateLimit(supabase, user.id)
    if (rateLimitError) return rateLimitError

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

    // Await so Vercel doesn't kill the function before the email sends
    await notifyNewReport({
      contentType: 'comment',
      contentId:   id,
      reason,
      description: description ?? null,
      reportedAt:  new Date().toISOString(),
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error reporting comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
