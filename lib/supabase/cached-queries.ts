import { SupabaseClient } from '@supabase/supabase-js'
import type { FeedPost, FeedPostQueryRowDTO, AdminPendingPostDTO, AdminPendingPostQueryRowDTO } from '@/lib/types'

/**
 * Get user profile with only essential columns
 * Next.js automatically deduplicates requests within the same render
 */
export async function getCachedUserProfile(userId: string, supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, flair, is_verified, is_alumni, mfa_enabled, rules_acknowledged_at, account_status, approved_by, approved_at, created_at, updated_at, graduation_year, major, last_login')
    .eq('id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

/**
 * Get all channels with only essential columns
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
 * Get posts by channel ID with only essential columns
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
      id, title, content, images, is_pinned, created_at, author_id, channel_id, approval_status, is_moderated, moderation_reason, likes_count,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
      channel:channels(id, name, slug, description, icon)
    `)
    .eq('channel_id', channelId)
    .eq('is_moderated', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  const rows = (data || []) as FeedPostQueryRowDTO[]
  return rows.map((post) => ({
    id: post.id,
    channel_id: post.channel_id,
    author_id: post.author_id,
    title: post.title,
    content: post.content,
    images: post.images,
    is_pinned: post.is_pinned,
    is_moderated: post.is_moderated,
    moderation_reason: post.moderation_reason,
    approval_status: post.approval_status,
    created_at: post.created_at,
    updated_at: post.updated_at,
    author: Array.isArray(post.author) ? (post.author[0] ?? null) : (post.author ?? null),
    channel: Array.isArray(post.channel) ? (post.channel[0] ?? null) : (post.channel ?? null),
    like_count: post.likes_count ?? 0,
    pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : (post.pending_edit ?? null),
  })) satisfies FeedPost[]
}

/**
 * Get posts by multiple channel IDs (for home feed) with only essential columns
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
      id, title, content, images, is_pinned, created_at, author_id, channel_id, approval_status, is_moderated, moderation_reason, likes_count,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
      channel:channels!inner(id, name, slug, description, icon),
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
  const rows = (data || []) as FeedPostQueryRowDTO[]
  return rows.map((post) => ({
    id: post.id,
    channel_id: post.channel_id,
    author_id: post.author_id,
    title: post.title,
    content: post.content,
    images: post.images,
    is_pinned: post.is_pinned,
    is_moderated: post.is_moderated,
    moderation_reason: post.moderation_reason,
    approval_status: post.approval_status,
    created_at: post.created_at,
    updated_at: post.updated_at,
    author: Array.isArray(post.author) ? (post.author[0] ?? null) : (post.author ?? null),
    channel: Array.isArray(post.channel) ? (post.channel[0] ?? null) : (post.channel ?? null),
    like_count: post.likes_count ?? 0,
    pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : (post.pending_edit ?? null),
  })) satisfies FeedPost[]
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
  // Parallel fetch: count + data with selective DTO columns
  const [countResult, dataResult] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .in('approval_status', ['pending', 'pending_edit']),
    supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        approval_status,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
        channel:channels!inner(id, name, slug),
        pending_edit:post_edits(proposed_title, proposed_content)
      `)
      .in('approval_status', ['pending', 'pending_edit'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  ])

  if (dataResult.error || countResult.error) {
    console.error('Error fetching pending posts:', dataResult.error || countResult.error)
    return { data: [], total: 0 }
  }

  const rows = (dataResult.data || []) as AdminPendingPostQueryRowDTO[]
  const data: AdminPendingPostDTO[] = rows.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    created_at: post.created_at,
    approval_status: post.approval_status,
    author: Array.isArray(post.author) ? (post.author[0] ?? null) : (post.author ?? null),
    channel: Array.isArray(post.channel) ? (post.channel[0] ?? null) : (post.channel ?? null),
    pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : (post.pending_edit ?? null),
  }))

  return {
    data,
    total: countResult.count || 0,
  }
}
