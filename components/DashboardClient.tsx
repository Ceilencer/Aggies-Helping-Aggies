'use client'

import { useEffect, useRef } from 'react'
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
import HomeAnnouncementSection from '@/components/HomeAnnouncementSection'
import PendingEditPreviewModal from '@/components/PendingEditPreviewModal'
import { useFirstTimeAgreement } from '@/lib/hooks/useFirstTimeAgreement'
import { useHomeFeedState } from '@/lib/hooks/useHomeFeedState'
import { useModalState } from '@/lib/hooks/useModalState'
import { getInitials } from '@/lib/utils'
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
    feedLoadError,
    loadMorePosts,
    handlePostCreated,
    handlePostDeleted,
    handlePostLikeChange,
    handlePostUpdated,
    handlePostCommentChange,
  } = useHomeFeedState({ profile, posts, allChannels })

  const {
    activePostId, setActivePostId,
    createPostOpen, setCreatePostOpen,
    createPostChannelSlug, openCreatePost,
    editingPostId, setEditingPostId,
    selectedUserId, setSelectedUserId,
    previewEditPostId, setPreviewEditPostId,
  } = useModalState()

  const { showToast, ToastContainer } = useToast()
  const agreementState = useFirstTimeAgreement(profile)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMorePosts) return
    const trigger = loadMoreTriggerRef.current
    if (!trigger) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMorePosts()
      },
      { root: null, rootMargin: '750px 0px', threshold: 0.1 }
    )

    observer.observe(trigger)
    return () => observer.disconnect()
  }, [hasMorePosts, loadMorePosts])

  const onPostUpdated = (updatedPost: Post) => {
    handlePostUpdated(updatedPost)
    setEditingPostId(null)
    if ((updatedPost as any)._pendingEdit) {
      showToast({ message: '✏️ Edit submitted — awaiting admin review', type: 'info', duration: 5000 })
    }
  }

  const editingPost = postsState.find(post => post.id === editingPostId)
  const editingChannel = allChannels.find(channel => channel.id === editingPost?.channel_id)
  const previewPost = postsState.find(p => p.id === previewEditPostId)

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
            <Button size="lg" onClick={() => openCreatePost()}>
              Create New Post
            </Button>
          </CardContent>
        </Card>

        <HomeAnnouncementSection
          initialAnnouncement={initialHomeAnnouncement}
          profileId={profile?.id}
          isAdmin={profile?.role === 'Admin'}
          isAgreementOpen={agreementState.isOpen}
        />

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-page-heading-text">Home Feed</h2>

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
                  <h3 className="text-xl font-bold text-card-header-text">{post.title}</h3>
                  <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {post.content.length > 300 ? `${post.content.substring(0, 300)}...` : post.content}
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
                <Button onClick={() => openCreatePost()}>Create First Post</Button>
              </CardContent>
            </Card>
          )}

          {postsState.length > 0 && (
            <div ref={loadMoreTriggerRef} className="py-4 text-center">
              {isLoadingMorePosts && (
                <p className="text-sm text-muted-foreground">Loading more posts...</p>
              )}
              {!isLoadingMorePosts && feedLoadError && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">{feedLoadError}</p>
                  <button
                    onClick={() => void loadMorePosts()}
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Try again
                  </button>
                </div>
              )}
              {!hasMorePosts && !feedLoadError && (
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

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
        onPostDeleted={handlePostDeleted}
        onProfileClick={setSelectedUserId}
        onPostLikeChange={handlePostLikeChange}
        onPostCommentChange={handlePostCommentChange}
      />

      <PendingEditPreviewModal
        post={previewPost}
        onClose={() => setPreviewEditPostId(null)}
      />

      <ToastContainer />
    </>
  )
}
