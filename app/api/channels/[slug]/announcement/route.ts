import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdminUser, requireAuthenticatedUser } from '@/lib/utils/api-auth'
import {
  getChannelAnnouncementByChannelId,
  upsertChannelAnnouncement,
} from '@/lib/supabase/channel-announcements'

const announcementSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content must be less than 5000 characters'),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    const auth = await requireAuthenticatedUser(supabase)
    if ('error' in auth) {
      return auth.error
    }

    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', slug)
      .single()

    if (channelError || !channel) {
      const message = slug === 'home'
        ? 'Home channel not found. Run scripts/add-home-channel.sql in Supabase SQL Editor.'
        : 'Channel not found'
      return NextResponse.json({ error: message }, { status: 404 })
    }

    const announcement = await getChannelAnnouncementByChannelId(supabase, channel.id)
    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error in GET /api/channels/[slug]/announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    const body = await request.json()
    const validation = announcementSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid request payload' },
        { status: 400 }
      )
    }

    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', slug)
      .single()

    if (channelError || !channel) {
      const message = slug === 'home'
        ? 'Home channel not found. Run scripts/add-home-channel.sql in Supabase SQL Editor.'
        : 'Channel not found'
      return NextResponse.json({ error: message }, { status: 404 })
    }

    const { data, error } = await upsertChannelAnnouncement(supabase, {
      channelId: channel.id,
      title: validation.data.title,
      content: validation.data.content,
      updatedBy: admin.user.id,
    })

    if (error || !data) {
      return NextResponse.json({ error: error || 'Failed to save channel announcement' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/channels/[slug]/announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
