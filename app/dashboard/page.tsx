import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'
import {
  getCachedUserProfile,
  getCachedAllChannels,
  getCachedPostsByChannel,
} from '@/lib/supabase/cached-queries'
import { getChannelAnnouncementByChannelId } from '@/lib/supabase/channel-announcements'
import { sortChannelsByDisplayOrder } from '@/lib/utils'
import type { ChannelAnnouncement, FeedPost } from '@/lib/types'

const SECTION_POSTS_LIMIT = 3

export default async function DashboardPage() {
  const supabase = await createClient()

  // --- WAVE 1: Authentication ---
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // --- WAVE 2: Fetch Cached Setup Data in Parallel ---
  const [profileData, allChannels] = await Promise.all([
    getCachedUserProfile(user.id, supabase),
    getCachedAllChannels(supabase),
  ])

  const profile = profileData

  // --- GUARD: profile missing means creation failed – send back to login ---
  if (!profile) {
    redirect('/login?error=auth_failed')
  }

  // --- GUARD: Block pending / suspended accounts from the dashboard ---
  if (profile?.account_status === 'pending_approval') {
    redirect('/pending-approval')
  }
  if (profile?.account_status === 'suspended') {
    redirect('/login')
  }

  const homeChannel = allChannels.find((channel) => channel.slug === 'home')
  const displayChannels = sortChannelsByDisplayOrder(
    allChannels.filter((channel) => channel.slug !== 'home' && channel.slug !== 'announcements')
  )

  // --- WAVE 3: Fetch posts per channel + channel announcements + home announcement in parallel ---
  const [channelPostsResults, channelAnnouncementResults, announcementResult] = await Promise.all([
    Promise.all(
      displayChannels.map((channel) => getCachedPostsByChannel(channel.id, supabase, SECTION_POSTS_LIMIT))
    ),
    Promise.all(
      displayChannels.map((channel) => getChannelAnnouncementByChannelId(supabase, channel.id))
    ),
    homeChannel?.id
      ? supabase
          .from('channel_announcements')
          .select(`
            id,
            channel_id,
            title,
            content,
            expires_at,
            updated_by,
            created_at,
            updated_at,
            updated_by_profile:profiles!channel_announcements_updated_by_fkey(id, full_name, avatar_url, role)
          `)
          .eq('channel_id', homeChannel.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  // --- WAVE 4: Enrich posts with per-user likes and comment counts ---
  const allPosts = channelPostsResults.flat()
  const allPostIds = allPosts.map((post) => post.id)

  const [likesResult, commentsResult] = await Promise.all([
    allPostIds.length > 0
      ? supabase
          .from('post_likes')
          .select('id, post_id')
          .eq('user_id', user.id)
          .in('post_id', allPostIds)
      : Promise.resolve({ data: [] as { id: string; post_id: string }[], error: null }),
    allPostIds.length > 0
      ? supabase
          .from('comments')
          .select('post_id')
          .in('post_id', allPostIds)
      : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
  ])

  const userLikes = likesResult.data || []
  const commentCounts = commentsResult.data || []

  const likedPostIds = new Set(userLikes.map((like) => like.post_id))
  const likeIdByPostId = new Map(userLikes.map((like) => [like.post_id, like.id]))

  const commentCountMap = new Map<string, number>()
  commentCounts.forEach((comment) => {
    commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1)
  })

  const enrichPost = (post: FeedPost): FeedPost => ({
    ...post,
    like_count: post.like_count ?? 0,
    comment_count: commentCountMap.get(post.id) ?? 0,
    user_has_liked: likedPostIds.has(post.id),
    like_id: likeIdByPostId.get(post.id) ?? null,
  })

  const channelSections = displayChannels
    .map((channel, i) => ({
      channel,
      posts: channelPostsResults[i].map(enrichPost),
      announcement: channelAnnouncementResults[i],
    }))
    .filter((section) => section.posts.length > 0 || section.announcement !== null)

  // --- Home announcement ---
  let initialHomeAnnouncement: ChannelAnnouncement | null = null

  if (announcementResult.data) {
    const expiresAt = (announcementResult.data as { expires_at?: string | null }).expires_at
    const isExpired = !!expiresAt && new Date(expiresAt) < new Date()
    if (!isExpired) {
      initialHomeAnnouncement = {
        ...announcementResult.data,
        updated_by_profile: Array.isArray((announcementResult.data as { updated_by_profile?: unknown }).updated_by_profile)
          ? ((announcementResult.data as { updated_by_profile?: any[] }).updated_by_profile?.[0] || null)
          : ((announcementResult.data as { updated_by_profile?: any }).updated_by_profile || null),
      }
    }
  }

  return (
    <DashboardClient
      profile={profile}
      channelSections={channelSections}
      allChannels={allChannels}
      initialHomeAnnouncement={initialHomeAnnouncement}
    />
  )
}
