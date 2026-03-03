'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
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
import ChannelAnnouncementModal from '@/components/ChannelAnnouncementModal'
import UserAvatar from '@/components/UserAvatar'
import { useFirstTimeAgreement } from '@/lib/hooks/useFirstTimeAgreement'
import { useHomeFeedState } from '@/lib/hooks/useHomeFeedState'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { Channel, ChannelAnnouncement, FeedPost, Post, Profile } from '@/lib/types'

interface DashboardClientProps {
  profile: Profile | null
  posts: FeedPost[]
  allChannels: Channel[]
  initialHomeAnnouncement: ChannelAnnouncement | null
}

export default function DashboardClient({
  profile,
  posts,
  allChannels,
  initialHomeAnnouncement,
}: DashboardClientProps) {
  const {
    postsState,
    hasMorePosts,
    isLoadingMorePosts,
    loadMorePosts,
    handlePostCreated,
    handlePostDeleted,
    handlePostLikeChange,
    handlePostUpdated,
    handlePostCommentChange,
  } = useHomeFeedState({
    profile,
    posts,
    allChannels,
  })
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [createPostChannelSlug, setCreatePostChannelSlug] = useState<string | undefined>(undefined)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [homeAnnouncement, setHomeAnnouncement] = useState<ChannelAnnouncement | null>(initialHomeAnnouncement)
  const [homeAnnouncementEditorOpen, setHomeAnnouncementEditorOpen] = useState(false)
  const [homeAnnouncementPopupOpen, setHomeAnnouncementPopupOpen] = useState(false)
  const [previewEditPostId, setPreviewEditPostId] = useState<string | null>(null)
  const { showToast, ToastContainer } = useToast()
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const agreementState = useFirstTimeAgreement(profile)

  const markHomeAnnouncementSeen = (updatedAt: string) => {
    if (typeof window === 'undefined' || !profile?.id) {
      return
    }

    window.localStorage.setItem(`home-announcement-seen-${profile.id}`, updatedAt)
  }

  useEffect(() => {
    if (!hasMorePosts) {
      return
    }

    const trigger = loadMoreTriggerRef.current
    if (!trigger) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMorePosts()
        }
      },
      { root: null, rootMargin: '750px 0px', threshold: 0.1 }
    )

    observer.observe(trigger)
    return () => {
      observer.disconnect()
    }
  }, [hasMorePosts, loadMorePosts])

  useEffect(() => {
    if (agreementState.isOpen || !homeAnnouncement?.updated_at || !profile?.id || typeof window === 'undefined') {
      setHomeAnnouncementPopupOpen(false)
      return
    }

    const seenVersion = window.localStorage.getItem(`home-announcement-seen-${profile.id}`)
    if (seenVersion !== homeAnnouncement.updated_at) {
      setHomeAnnouncementPopupOpen(true)
    }
  }, [homeAnnouncement?.updated_at, agreementState.isOpen, profile?.id])

  const openCreatePost = (channelSlug?: string) => {
    setCreatePostChannelSlug(channelSlug)
    setCreatePostOpen(true)
  }

  const onPostUpdated = (updatedPost: Post) => {
    handlePostUpdated(updatedPost)
    setEditingPostId(null)
    if ((updatedPost as any)._pendingEdit) {
      showToast({ message: '✏️ Edit submitted — awaiting admin review', type: 'info', duration: 5000 })
    }
  }

  const dismissHomeAnnouncementPopup = () => {
    if (homeAnnouncement?.updated_at) {
      markHomeAnnouncementSeen(homeAnnouncement.updated_at)
    }
    setHomeAnnouncementPopupOpen(false)
  }

  const editingPost = postsState.find(post => post.id === editingPostId)
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
              {profile?.role === 'Admin' && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setHomeAnnouncementEditorOpen(true)}
                >
                  {homeAnnouncement ? 'Edit Announcement' : 'Post Announcement'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {homeAnnouncement && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold text-page-heading-text">Announcement</h2>
            </div>
            <Card className="bg-pinned-announcement-bg/5 border-l-4 border-pinned-announcement-border dark:bg-pinned-announcement-bg/20 dark:border-l-4 dark:border-pinned-announcement-border-dark">
              <CardHeader>
                <div className="flex items-center gap-3 min-w-0">
                  {homeAnnouncement.updated_by_profile ? (
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={homeAnnouncement.updated_by_profile} size="sm" linkToProfile={false} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-card-header-text truncate">
                          {homeAnnouncement.updated_by_profile.full_name}
                        </p>
                        <p className="text-xs text-card-subtext">Updated {formatRelativeTime(homeAnnouncement.updated_at)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-card-subtext">Updated {formatRelativeTime(homeAnnouncement.updated_at)}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <h2 className="text-xl font-bold text-card-header-text mb-2">
                  {homeAnnouncement.title}
                </h2>
                <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {homeAnnouncement.content}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-page-heading-text">Home Feed</h2>
          </div>

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
                    onEditClick={post.approval_status === 'pending_edit' && post.author_id === profile?.id ? undefined : () => setEditingPostId(post.id)}
                    onProfileClick={setSelectedUserId}
                    onViewPendingEdit={post.approval_status === 'pending_edit' && post.author_id === profile?.id && post.pending_edit ? () => setPreviewEditPostId(post.id) : undefined}
                  />
                </CardHeader>

                <CardContent className="space-y-3 pb-0">
                  <h3 className="text-xl font-bold text-card-header-text">
                    {post.title}
                  </h3>
                  <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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

          {postsState.length > 0 && (
            <div ref={loadMoreTriggerRef} className="py-4 text-center">
              {isLoadingMorePosts && (
                <p className="text-sm text-muted-foreground">Loading more posts...</p>
              )}
              {!hasMorePosts && (
                <p className="text-sm text-muted-foreground">You&apos;ve reached the end of your home feed.</p>
              )}
            </div>
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
          onPostUpdated={onPostUpdated}
        />
      )}

      <ChannelAnnouncementModal
        isOpen={homeAnnouncementEditorOpen}
        channelSlug="home"
        initialAnnouncement={homeAnnouncement}
        onClose={() => setHomeAnnouncementEditorOpen(false)}
        onSaved={(announcement) => {
          markHomeAnnouncementSeen(announcement.updated_at)
          setHomeAnnouncement(announcement)
          setHomeAnnouncementPopupOpen(false)
        }}
      />

      <Modal
        isOpen={homeAnnouncementPopupOpen}
        onClose={dismissHomeAnnouncementPopup}
        title="Home Announcement"
        headerExtra={homeAnnouncement?.updated_by_profile ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1">
            <UserAvatar user={homeAnnouncement.updated_by_profile} size="sm" linkToProfile={false} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-card-header-text truncate leading-tight">
                {homeAnnouncement.updated_by_profile.full_name}
              </p>
              <p className="text-[11px] text-card-subtext leading-tight">Updated {formatRelativeTime(homeAnnouncement.updated_at)}</p>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-card-subtext leading-tight">Updated {formatRelativeTime(homeAnnouncement?.updated_at || '')}</span>
        )}
        size="md"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-card-header-text">
            {homeAnnouncement?.title}
          </h2>
          <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {homeAnnouncement?.content}
          </p>
          <div className="flex justify-end">
            <Button onClick={dismissHomeAnnouncementPopup}>Close</Button>
          </div>
        </div>
      </Modal>

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
        onPostDeleted={handlePostDeleted}
        onProfileClick={setSelectedUserId}
        onPostLikeChange={handlePostLikeChange}
        onPostCommentChange={handlePostCommentChange}
      />

      {(() => {
        const previewPost = postsState.find(p => p.id === previewEditPostId)
        return (
          <Modal
            isOpen={!!previewEditPostId}
            onClose={() => setPreviewEditPostId(null)}
            title="Your Pending Edit"
            size="md"
          >
            {previewPost?.pending_edit ? (
              <div className="space-y-6 p-6">
                <p className="text-sm text-muted-foreground">
                  This edit is currently under admin review. The changes below will go live if approved.
                </p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Proposed Title</p>
                    <p className="font-semibold text-card-header-text">{previewPost.pending_edit.proposed_title}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Proposed Content</p>
                    <p className="text-sm text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {previewPost.pending_edit.proposed_content}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Current post</span> remains visible to other users until this edit is approved.
                  </p>
                </div>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No pending edit data available.</p>
            )}
          </Modal>
        )
      })()}

      <ToastContainer />
    </>
  )
}
