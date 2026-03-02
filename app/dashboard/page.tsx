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
    ? await getCachedPostsByChannels(homeChannelIds, supabase, 5)
    : []

  // --- WAVE 4: Optimize Likes for Posts (Batch Processing) ---
  const allPostIds = postsData.map((post: any) => post.id)

  let posts = postsData

  const homeChannel = allChannels.find((channel: any) => channel.slug === 'home')
  let initialHomeAnnouncement: ChannelAnnouncement | null = null

  if (homeChannel?.id) {
    const { data: announcementData } = await supabase
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

    if (announcementData) {
      initialHomeAnnouncement = {
        ...announcementData,
        updated_by_profile: Array.isArray((announcementData as any).updated_by_profile)
          ? (announcementData as any).updated_by_profile[0] || null
          : (announcementData as any).updated_by_profile || null,
      }
    }
  }

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