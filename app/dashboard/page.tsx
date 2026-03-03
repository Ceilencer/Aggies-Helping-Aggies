import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'
import {
  getCachedUserProfile,
  getCachedHomeChannels,
  getCachedAllChannels,
  getCachedPostsByChannels,
} from '@/lib/supabase/cached-queries'
import type { ChannelAnnouncement } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // --- WAVE 1: Authentication ---
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // --- WAVE 2: Fetch Cached Setup Data in Parallel ---
  const [profileData, homeChannels, allChannels] = await Promise.all([
    getCachedUserProfile(user.id, supabase),
    getCachedHomeChannels(supabase),
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

  const homeChannelIds = homeChannels?.map(c => c.id) ?? []

  // --- WAVE 3: Fetch Content in Parallel ---
  const postsData = homeChannelIds.length > 0
    ? await getCachedPostsByChannels(homeChannelIds, supabase, 10)
    : []

  // --- WAVE 4: Optimize Likes and Comments for Posts + Home Announcement (parallel) ---
  const allPostIds = postsData.map((post: any) => post.id)

  let posts = postsData
  let initialHomeAnnouncement: ChannelAnnouncement | null = null

  const homeChannel = allChannels.find((channel: any) => channel.slug === 'home')

  // Fetch home announcement, likes, and comments in parallel to maximize throughput
  const announcementPromise = homeChannel?.id
    ? supabase
        .from('channel_announcements')
        .select(`
          id,
          channel_id,
          title,
          content,
          updated_by,
          created_at,
          updated_at,
          updated_by_profile:profiles!channel_announcements_updated_by_fkey(id, full_name, avatar_url, role)
        `)
        .eq('channel_id', homeChannel.id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const likesAndCommentsPromises = allPostIds.length > 0
    ? [
        supabase
          .from('post_likes')
          .select('id, post_id')
          .eq('user_id', user.id)
          .in('post_id', allPostIds),
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', allPostIds)
      ]
    : [Promise.resolve({ data: [], error: null }), Promise.resolve({ data: [], error: null })]

  const [announcementResult, likesResult, commentsResult] = await Promise.all([
    announcementPromise,
    ...likesAndCommentsPromises
  ])

  if (announcementResult.data) {
    initialHomeAnnouncement = {
      ...announcementResult.data,
      updated_by_profile: Array.isArray((announcementResult.data as any).updated_by_profile)
        ? (announcementResult.data as any).updated_by_profile[0] || null
        : (announcementResult.data as any).updated_by_profile || null,
    }
  }

  if (allPostIds.length > 0) {
    const userLikes = likesResult.data || []
    const commentCounts = commentsResult.data || []

    const likedPostIds = new Set((userLikes || []).map((like) => like.post_id))
    const likeIdByPostId = new Map((userLikes || []).map((like) => [like.post_id, like.id]))

    let commentCountMap = new Map<string, number>()
    commentCounts?.forEach((comment) => {
      commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1)
    })

    posts = postsData.map((post: any) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: commentCountMap.get(post.id) ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
    }))
  }

  return (
    <DashboardClient
      profile={profile}
      posts={posts}
      allChannels={allChannels}
      initialHomeAnnouncement={initialHomeAnnouncement}
    />
  )
}