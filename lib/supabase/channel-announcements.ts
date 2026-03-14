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
  expires_at,
  updated_by,
  created_at,
  updated_at,
  updated_by_profile:profiles!channel_announcements_updated_by_fkey(id, full_name, avatar_url, role)
`

function normalizeRow(row: AnnouncementSelectRow): ChannelAnnouncement {
  return {
    ...row,
    updated_by_profile: Array.isArray(row.updated_by_profile)
      ? (row.updated_by_profile[0] ?? null)
      : (row.updated_by_profile ?? null),
  }
}

function isExpired(announcement: ChannelAnnouncement): boolean {
  return !!announcement.expires_at && new Date(announcement.expires_at) < new Date()
}

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

  if (!data) return null

  const normalized = normalizeRow(data)
  return isExpired(normalized) ? null : normalized
}

export async function upsertChannelAnnouncement(
  supabase: SupabaseClient,
  params: {
    channelId: string
    title: string
    content: string
    updatedBy: string
    expiresAt?: string | null
  }
): Promise<{ data: ChannelAnnouncement | null; error: string | null }> {
  const { channelId, title, content, updatedBy, expiresAt } = params

  const { data, error } = await supabase
    .from('channel_announcements')
    .upsert(
      {
        channel_id: channelId,
        title: title.trim(),
        content: content.trim(),
        updated_by: updatedBy,
        expires_at: expiresAt ?? null,
      },
      { onConflict: 'channel_id' }
    )
    .select(ANNOUNCEMENT_SELECT)
    .single<AnnouncementSelectRow>()

  if (error) {
    console.error('Error upserting channel announcement:', error)
    return { data: null, error: 'Failed to save channel announcement' }
  }

  return { data: normalizeRow(data), error: null }
}

export async function deleteChannelAnnouncement(
  supabase: SupabaseClient,
  channelId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('channel_announcements')
    .delete()
    .eq('channel_id', channelId)

  if (error) {
    console.error('Error deleting channel announcement:', error)
    return { error: 'Failed to remove channel announcement' }
  }

  return { error: null }
}
