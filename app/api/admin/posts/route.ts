import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getCachedPendingPosts } from '@/lib/supabase/cached-queries'
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

    // Fetch pending posts with caching
    const result = await getCachedPendingPosts(offset, supabase, limit)

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
