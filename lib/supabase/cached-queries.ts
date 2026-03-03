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
    .maybeSingle()
  
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
      channel:channels!inner(*),
      pending_edit:post_edits(proposed_title, proposed_content)
    `)
    .in('channel_id', channelIds)
    .eq('is_moderated', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return (data || []).map((post: any) => ({
    ...post,
    pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : post.pending_edit,
  }))
}

/**
 * Get pending posts (for admin dashboard)
 * Includes both new posts awaiting first approval (approval_status='pending')
 * and existing posts with a submitted edit awaiting review (approval_status='pending_edit')
 */
export async function getCachedPendingPosts(
  offset: number,
  supabase: SupabaseClient,
  limit: number = 15
) {
  const baseSelect = `
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels!inner(*),
      pending_edit:post_edits(proposed_title, proposed_content)
    `

  const countResult = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .in('approval_status', ['pending', 'pending_edit'])

  const dataResult = await supabase
    .from('posts')
    .select(baseSelect)
    .in('approval_status', ['pending', 'pending_edit'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (dataResult.error || countResult.error) {
    console.error('Error fetching pending posts:', dataResult.error || countResult.error)
    return { data: [], total: 0 }
  }

  // Supabase returns pending_edit as an array (one-to-many join); flatten to single object or null
  const data = (dataResult.data || []).map((post: any) => ({
    ...post,
    pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : post.pending_edit,
  }))

  return {
    data,
    total: countResult.count || 0,
  }
}
