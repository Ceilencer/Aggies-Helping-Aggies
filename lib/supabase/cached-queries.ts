import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get user profile
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedUserProfile(userId: string, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

/**
 * Get all channels
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedAllChannels(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching channels:', error)
    return []
  }
  return data || []
}

/**
 * Get specific channel by slug
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedChannelBySlug(slug: string, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error) {
    console.error('Error fetching channel:', error)
    return null
  }
  return data
}

/**
 * Get announcement channel
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedAnnouncementChannel(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('channels')
    .select('id')
    .eq('slug', 'announcements')
    .single()
  
  if (error) {
    console.error('Error fetching announcement channel:', error)
    return null
  }
  return data
}

/**
 * Get home channel IDs (general, promotions)
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedHomeChannels(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('channels')
    .select('id, slug')
    .in('slug', ['general', 'promotions'])
  
  if (error) {
    console.error('Error fetching home channels:', error)
    return []
  }
  return data || []
}

/**
 * Get posts by channel ID
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedPostsByChannel(
  channelId: string,
  supabase: SupabaseClient,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels(*)
    `)
    .eq('channel_id', channelId)
    .eq('is_moderated', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return data || []
}

/**
 * Get posts by multiple channel IDs (for home feed)
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedPostsByChannels(
  channelIds: string[],
  supabase: SupabaseClient,
  limit: number = 20
) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels!inner(*)
    `)
    .in('channel_id', channelIds)
    .eq('is_moderated', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return data || []
}

/**
 * Get announcements
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedAnnouncements(
  channelId: string,
  supabase: SupabaseClient,
  limit: number = 5
) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels!inner(*)
    `)
    .eq('channel_id', channelId)
    .eq('is_moderated', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching announcements:', error)
    return []
  }
  return data || []
}

/**
 * Get pending posts (for admin dashboard)
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedPendingPosts(
  offset: number,
  supabase: SupabaseClient,
  limit: number = 15
) {
  // Get total count - posts that are either moderated or pending approval
  const { count, error: countError } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .or('is_moderated.eq.false,approval_status.eq.pending')

  // Get paginated data - posts that are either moderated or pending approval
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels!inner(*)
    `)
    .or('is_moderated.eq.false,approval_status.eq.pending')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) {
    console.error('Error fetching pending posts:', error)
    return { data: [], total: 0 }
  }
  
  return {
    data: data || [],
    total: count || 0
  }
}
