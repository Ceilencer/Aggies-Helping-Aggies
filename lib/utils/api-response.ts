import { NextResponse } from 'next/server'

/**
 * Standard API error response shape: { error: string }
 *
 * All API routes should use this helper for error responses so the client
 * can always expect the same shape and handle errors uniformly.
 *
 * Usage:
 *   return apiError('Unauthorized', 401)
 *   return apiError('Post not found', 404)
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}
