import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'
import {
  getCachedUserProfile,
  getCachedAnnouncementChannel,
  getCachedHomeChannels,
  getCachedAllChannels,
  getCachedPostsByChannels,
  getCachedAnnouncements,
} from '@/lib/supabase/cached-queries'

export default async function DashboardPage() {
  const supabase = await createClient()

  // --- WAVE 1: Authentication ---
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // --- WAVE 2: Fetch Cached Setup Data in Parallel ---
  const [profileData, announcementChannel, homeChannels, allChannels] = await Promise.all([
    getCachedUserProfile(user.id, supabase),
    getCachedAnnouncementChannel(supabase),
    getCachedHomeChannels(supabase),
    getCachedAllChannels(supabase),
  ])

  const profile = profileData
  const homeChannelIds = homeChannels?.map(c => c.id) ?? []

  // --- WAVE 3: Fetch Content in Parallel ---
  const [postsData, announcementsData] = await Promise.all([
    homeChannelIds.length > 0
      ? getCachedPostsByChannels(homeChannelIds, supabase, 20)
      : Promise.resolve([]),
    announcementChannel?.id
      ? getCachedAnnouncements(announcementChannel.id, supabase, 5)
      : Promise.resolve([]),
  ])

  // --- WAVE 4: Optimize Likes for Both Posts and Announcements (Batch Processing) ---
  const allPostIds = [
    ...postsData.map((post: any) => post.id),
    ...announcementsData.map((post: any) => post.id),
  ]

  let posts = postsData
  let announcementsPosts = announcementsData

  if (allPostIds.length > 0) {
    const { data: userLikes } = await supabase
      .from('post_likes')
      .select('id, post_id')
      .eq('user_id', user.id)
      .in('post_id', allPostIds)

    const likedPostIds = new Set((userLikes || []).map((like) => like.post_id))
    const likeIdByPostId = new Map((userLikes || []).map((like) => [like.post_id, like.id]))

    posts = postsData.map((post: any) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: post.comment_count ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
    }))

    announcementsPosts = announcementsData.map((post: any) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: post.comment_count ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
    }))
  }

  return (
    <DashboardClient
      profile={profile}
      posts={posts}
      announcements={announcementsPosts}
      allChannels={allChannels}
    />
  )
}