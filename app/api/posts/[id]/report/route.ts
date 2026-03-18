import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/utils/api-auth'
import { validateReportInput, checkReportRateLimit } from '@/lib/utils/reports'

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

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const rateLimitError = await checkReportRateLimit(supabase, user.id)
    if (rateLimitError) return rateLimitError

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

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error reporting post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
