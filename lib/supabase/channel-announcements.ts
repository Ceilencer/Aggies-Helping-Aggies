import { SupabaseClient } from '@supabase/supabase-js'
import type { ChannelAnnouncement } from '@/lib/types'

type AnnouncementSelectRow = Omit<ChannelAnnouncement, 'updated_by_profile'> & {
  updated_by_profile?: ChannelAnnouncement['updated_by_profile']
}

const ANNOUNCEMENT_SELECT = `
  id,
  channel_id,
  title,
  content,
  updated_by,
  created_at,
  updated_at,
  updated_by_profile:profiles!channel_announcements_updated_by_fkey(id, full_name, avatar_url, role)
`

export async function getChannelAnnouncementByChannelId(
  supabase: SupabaseClient,
  channelId: string
): Promise<ChannelAnnouncement | null> {
  const { data, error } = await supabase
    .from('channel_announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('channel_id', channelId)
    .maybeSingle<AnnouncementSelectRow>()

  if (error) {
    console.error('Error fetching channel announcement:', error)
    return null
  }

  return data || null
}

export async function upsertChannelAnnouncement(
  supabase: SupabaseClient,
  params: {
    channelId: string
    title: string
    content: string
    updatedBy: string
  }
): Promise<{ data: ChannelAnnouncement | null; error: string | null }> {
  const { channelId, title, content, updatedBy } = params

  const { data, error } = await supabase
    .from('channel_announcements')
    .upsert(
      {
        channel_id: channelId,
        title: title.trim(),
        content: content.trim(),
        updated_by: updatedBy,
      },
      { onConflict: 'channel_id' }
    )
    .select(ANNOUNCEMENT_SELECT)
    .single<AnnouncementSelectRow>()

  if (error) {
    console.error('Error upserting channel announcement:', error)
    return { data: null, error: 'Failed to save channel announcement' }
  }

  return { data, error: null }
}
