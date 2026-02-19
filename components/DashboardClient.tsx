'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentCountButton from '@/components/CommentCountButton'
import PostCardHeader from '@/components/PostCardHeader'
import { PostImageGrid } from '@/components/PostImageGrid'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'
import CreatePostModal from '@/components/CreatePostModal'
import EditPostModal from '@/components/EditPostModal'
import PostDetailModal from '@/components/PostDetailModal'
import UserAgreementModal from '@/components/UserAgreementModal'
import UserProfileModal from '@/components/UserProfileModal'
import { useFirstTimeAgreement } from '@/lib/hooks/useFirstTimeAgreement'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'
import type { Channel, FeedPost, Post, Profile } from '@/lib/types'

interface DashboardClientProps {
  profile: Profile | null
  posts: FeedPost[]
  announcements: FeedPost[]
  allChannels: Channel[]
}

export default function DashboardClient({
  profile,
  posts,
  announcements,
  allChannels,
}: DashboardClientProps) {
  const [postsState, setPostsState] = useState<FeedPost[]>(posts)
  const [announcementsState, setAnnouncementsState] = useState<FeedPost[]>(announcements)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [createPostChannelSlug, setCreatePostChannelSlug] = useState<string | undefined>(undefined)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const agreementState = useFirstTimeAgreement(profile)

  const openCreatePost = (channelSlug?: string) => {
    setCreatePostChannelSlug(channelSlug)
    setCreatePostOpen(true)
  }

  const handlePostCreated = (newPost: Post, channel: Channel | null) => {
    const resolvedChannel = channel || allChannels.find(c => c.id === newPost.channel_id) || undefined
    const hydratedPost: FeedPost = {
      ...newPost,
      author: profile || undefined,
      channel: resolvedChannel,
      like_count: 0,
      comment_count: 0,
      user_has_liked: false,
      like_id: null,
      view_count: newPost.view_count ?? 0,
    }

    if (resolvedChannel?.slug === 'announcements') {
      setAnnouncementsState(current => [hydratedPost, ...current])
    } else {
      setPostsState(current => [hydratedPost, ...current])
    }
  }

  const handlePostDeleted = (postId: string) => {
    setPostsState(current => current.filter(post => post.id !== postId))
    setAnnouncementsState(current => current.filter(post => post.id !== postId))
  }

  const handlePostUpdated = (updatedPost: Post) => {
    const hydratedPost: FeedPost = {
      ...updatedPost,
      author: updatedPost.author || profile || undefined,
      channel: updatedPost.channel,
      like_count: updatedPost.like_count,
      comment_count: updatedPost.comment_count,
      user_has_liked: false,
      like_id: null,
    }

    setPostsState(current =>
      current.map(post => post.id === updatedPost.id ? hydratedPost : post)
    )
    setAnnouncementsState(current =>
      current.map(post => post.id === updatedPost.id ? hydratedPost : post)
    )
    setEditingPostId(null)
  }

  const editingPost = [...postsState, ...announcementsState].find(post => post.id === editingPostId)
  const editingChannel = allChannels.find(channel => channel.id === editingPost?.channel_id)

  return (
    <>
      <UserAgreementModal
        isOpen={agreementState.isOpen}
        onAgree={agreementState.handleAgree}
        isLoading={agreementState.isLoading}
      />
      <UserProfileModal
        isOpen={selectedUserId !== null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
      <div className="space-y-6">
        <Card>
          <CardHeader className="bg-dash-header-bg text-dash-header-text">
            <CardTitle className="text-2xl text-dash-header-text">
              <span className="inline-flex items-center gap-3">
                {profile?.avatar_url ? (
                  <span className="relative h-10 w-10 overflow-hidden rounded-full">
                    <Image
                      src={profile.avatar_url}
                      alt={`${profile?.full_name || 'User'} avatar`}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {getInitials(profile?.full_name || 'Unknown')}
                  </span>
                )}
                <span>Howdy, {profile?.full_name}! 👋</span>
              </span>
            </CardTitle>
            <CardDescription className="text-dash-header-text/80">
              Welcome to the Aggie community. Stay connected, share opportunities, and help fellow Aggies thrive.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => openCreatePost()}>
                Create New Post
              </Button>
              <Link href="/dashboard/my-posts">
                <Button size="lg" variant="outline">
                  View My Posts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-page-heading-text">Home Feed</h2>
            {profile?.role === 'Admin' && (
              <Button variant="outline" size="sm" onClick={() => openCreatePost('announcements')}>
                Post Announcement
              </Button>
            )}
          </div>

          {announcementsState && announcementsState.length > 0 && (
            announcementsState.map((announcement: FeedPost) => (
              <Card
                key={announcement.id}
                className="bg-pinned-announcement-bg/5 border-l-4 border-pinned-announcement-border dark:bg-pinned-announcement-bg/20 dark:border-l-4 dark:border-pinned-announcement-border-dark"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {announcement.author?.avatar_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-full">
                          <Image
                            src={announcement.author.avatar_url}
                            alt={`${announcement.author?.full_name || 'User'} avatar`}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                          {getInitials(announcement.author?.full_name || 'Unknown')}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-card-header-text">
                            {announcement.author?.full_name}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(announcement.author?.role || 'Personal')}`}>
                            {announcement.author?.role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-card-subtext">
                          <span>{announcement.channel?.icon} {announcement.channel?.name}</span>
                          <span>•</span>
                          <span>📌 {formatRelativeTime(announcement.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="text-xl font-bold text-card-header-text">
                    {announcement.title}
                  </h3>
                  <p className="text-card-subtext whitespace-pre-wrap">
                    {announcement.content}
                  </p>

                  {announcement.images && announcement.images.length > 0 && (
                    <PostImageGrid images={announcement.images} postTitle={announcement.title} maxImages={3} />
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {postsState && postsState.length > 0 ? (
            postsState.map((post: FeedPost) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <PostCardHeader
                    post={post}
                    isAdmin={profile?.role === 'Admin'}
                    channels={allChannels}
                    currentUserId={profile?.id}
                    onPostDeleted={handlePostDeleted}
                    onEditClick={() => setEditingPostId(post.id)}
                    onProfileClick={setSelectedUserId}
                  />
                </CardHeader>

                <CardContent className="space-y-3 pb-0">
                  <h3 className="text-xl font-bold text-card-header-text">
                    {post.title}
                  </h3>
                  <p className="text-card-subtext whitespace-pre-wrap">
                    {post.content.length > 300
                      ? `${post.content.substring(0, 300)}...`
                      : post.content
                    }
                  </p>

                  {post.images && post.images.length > 0 && (
                    <PostImageGrid images={post.images} postTitle={post.title} maxImages={3} />
                  )}

                  <div className="flex items-center justify-between space-x-4 py-4 border-t">
                    <div className="flex items-center space-x-4">
                      <PostLikeButton
                        postId={post.id}
                        likeCount={post.like_count || 0}
                        userHasLiked={post.user_has_liked || false}
                        likeId={post.like_id || null}
                      />
                      <CommentCountButton
                        postId={post.id}
                        commentCount={post.comment_count || 0}
                        onOpenPost={() => setActivePostId(post.id)}
                      />
                      <span className="text-sm text-card-subtext">
                        👁️ {post.view_count} views
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActivePostId(post.id)}>
                      View Full Post
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No posts yet. Be the first to share something with the community!
                </p>
                <Button onClick={() => openCreatePost()}>
                  Create First Post
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <FloatingCreatePostButton onClick={() => openCreatePost()} />
      </div>

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        initialChannelSlug={createPostChannelSlug}
        onPostCreated={handlePostCreated}
      />

      {editingPost && (
        <EditPostModal
          isOpen={!!editingPostId}
          onClose={() => setEditingPostId(null)}
          post={editingPost}
          channel={editingChannel}
          onPostUpdated={handlePostUpdated}
        />
      )}

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
        onPostDeleted={handlePostDeleted}
        onProfileClick={setSelectedUserId}
      />
    </>
  )
}
