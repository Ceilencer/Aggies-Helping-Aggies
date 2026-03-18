import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Validate the reason and description fields shared by post and comment reports.
 * Returns a NextResponse error if invalid, or null if valid.
 */
export function validateReportInput(
  reason: unknown,
  description: unknown
): NextResponse | null {
  if (!reason || typeof reason !== 'string') {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
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

  return null
}

/**
 * Enforce a rate limit of 5 reports per user per hour.
 * Returns a NextResponse error if the limit is exceeded, or null if within the limit.
 */
export async function checkReportRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reported_by', userId)
    .gte('created_at', oneHourAgo)

  if ((recentCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'You are submitting reports too quickly. Please wait before reporting again.' },
      { status: 429 }
    )
  }

  return null
}
