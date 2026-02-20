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
 * Get pending posts (for admin dashboard)
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedPendingPosts(
  offset: number,
  supabase: SupabaseClient,
  limit: number = 15
) {
  const isMissingApprovalStatus = (error: { message?: string; code?: string } | null) => {
    return !!error && (error.code === '42703' || error.message?.includes('approval_status'))
  }

  const baseSelect = `
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels!inner(*)
    `

  const countResult = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending')

  const dataResult = await supabase
    .from('posts')
    .select(baseSelect)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!dataResult.error && !countResult.error) {
    return {
      data: dataResult.data || [],
      total: countResult.count || 0,
    }
  }

  if (isMissingApprovalStatus(dataResult.error) || isMissingApprovalStatus(countResult.error)) {
    const fallbackCount = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('is_moderated', false)

    const fallbackData = await supabase
      .from('posts')
      .select(baseSelect)
      .eq('is_moderated', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fallbackData.error) {
      console.error('Error fetching pending posts (fallback):', fallbackData.error)
      return { data: [], total: 0 }
    }

    return {
      data: fallbackData.data || [],
      total: fallbackCount.count || 0,
    }
  }

  console.error('Error fetching pending posts:', dataResult.error || countResult.error)
  return { data: [], total: 0 }
}
