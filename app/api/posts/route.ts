import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/utils/api-auth'
import { createPostSchema } from '@/lib/validations'
import { validatePost } from '@/lib/profanity-filter'
import { POST_LIMITS, type UserRole } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate
    const auth = await requireAuthenticatedUser(supabase)
    if ('error' in auth) return auth.error
    const { user } = auth

    // 2. Parse and validate input shape
    const body = await request.json()
    const validation = createPostSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { channel_id, title, content } = validation.data

    // 3. Server-side profanity check
    const profanityCheck = validatePost(title, content)
    if (!profanityCheck.valid) {
      return NextResponse.json(
        { error: profanityCheck.error || 'Content contains inappropriate language' },
        { status: 400 }
      )
    }

    // 4. Fetch profile — verify account is active and verified
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_verified, account_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.account_status !== 'active') {
      return NextResponse.json(
        { error: 'Your account is not active. Please contact an administrator.' },
        { status: 403 }
      )
    }

    if (!profile.is_verified) {
      return NextResponse.json(
        { error: 'Your account must be verified before you can create posts.' },
        { status: 403 }
      )
    }

    const role = profile.role as UserRole
    const isAdmin = role === 'Admin'

    // 5. Verify the channel exists and is writable
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, is_read_only')
      .eq('id', channel_id)
      .single()

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (channel.is_read_only && !isAdmin) {
      return NextResponse.json(
        { error: 'This channel is read-only.' },
        { status: 403 }
      )
    }

    // 6. Server-side post-limit check via RPC
    const limits = POST_LIMITS[role] ?? POST_LIMITS['Personal']
    const { data: trackingData, error: trackingError } = await supabase.rpc('get_post_counts')
    if (trackingError) {
      console.error('Error fetching post counts from RPC:', trackingError)
      return NextResponse.json({ error: 'Unable to verify post limits. Please try again.' }, { status: 500 })
    }
    if (trackingData) {
      const tracking = Array.isArray(trackingData) ? trackingData[0] : trackingData
      if (tracking) {
        if (tracking.daily_post_count >= limits.daily) {
          return NextResponse.json(
            { error: `Daily post limit reached (${limits.daily} per day for ${role} accounts).` },
            { status: 429 }
          )
        }
        if (tracking.monthly_post_count >= limits.monthly) {
          return NextResponse.json(
            { error: `Monthly post limit reached (${limits.monthly} per month for ${role} accounts).` },
            { status: 429 }
          )
        }
      }
    }

    // 7. Insert the post — approval status and moderation flag set server-side only
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        channel_id,
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        is_moderated: isAdmin,
        moderation_reason: null,
        approval_status: isAdmin ? 'approved' : 'pending',
      })
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
        channel:channels!inner(id, name, slug, description, icon)
      `)
      .single()

    if (insertError) {
      console.error('Error creating post:', insertError)
      if (insertError.message?.includes('post limit')) {
        return NextResponse.json({ error: insertError.message }, { status: 429 })
      }
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json(newPost, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
