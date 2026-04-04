'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import { useCommentCountRealtime } from '@/lib/hooks/useCommentCountRealtime'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentCountButton from '@/components/CommentCountButton'
import PostCardHeader from '@/components/PostCardHeader'
import { PostImageGrid } from '@/components/PostImageGrid'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'
import { NewPostsBubble } from '@/components/NewPostsBubble'
import CreatePostModal from '@/components/CreatePostModal'
import EditPostModal from '@/components/EditPostModal'
import PostDetailModal from '@/components/PostDetailModal'
import UserAgreementModal from '@/components/UserAgreementModal'
import UserProfileModal from '@/components/UserProfileModal'
import HomeAnnouncementSection from '@/components/HomeAnnouncementSection'
import PendingEditPreviewModal from '@/components/PendingEditPreviewModal'
import { useFirstTimeAgreement } from '@/lib/hooks/useFirstTimeAgreement'
import { useHomeFeedState, type ChannelSection } from '@/lib/hooks/useHomeFeedState'
import { useAnnouncementRealtime } from '@/lib/hooks/useAnnouncementRealtime'
import { useHomePostRealtime } from '@/lib/hooks/useHomePostRealtime'
import { useModalState } from '@/lib/hooks/useModalState'
import { getInitials } from '@/lib/utils'
import ChannelIcon from '@/components/ChannelIcon'
import { useToast } from '@/components/ui/toast'
import type { Channel, ChannelAnnouncement, FeedPost, Post, Profile } from '@/lib/types'

function ChannelAnnouncementBanner({
  announcement,
  onExpire,
}: {
  announcement: ChannelAnnouncement
  onExpire: () => void
}) {
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  const [hidden, setHidden] = useState(() =>
    !!announcement.expires_at && new Date(announcement.expires_at) < new Date()
  )

  useEffect(() => {
    if (!announcement.expires_at) return
    const msLeft = new Date(announcement.expires_at).getTime() - Date.now()
    if (msLeft <= 0) { setHidden(true); onExpireRef.current(); return }
    const timer = setTimeout(() => { setHidden(true); onExpireRef.current() }, msLeft)
    return () => clearTimeout(timer)
  }, [announcement.expires_at])

  if (hidden) return null

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <span className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">📢</span>
      <div className="min-w-0">
        <span className="font-medium text-card-header-text">{announcement.title}</span>
        {announcement.content.length > 80 && (
          <span className="text-card-subtext"> — {announcement.content.slice(0, 80)}…</span>
        )}
        {announcement.content.length <= 80 && announcement.content && (
          <span className="text-card-subtext"> — {announcement.content}</span>
        )}
      </div>
    </div>
  )
}

interface DashboardClientProps {
  profile: Profile | null
  channelSections: ChannelSection[]
  allChannels: Channel[]
  initialHomeAnnouncement: ChannelAnnouncement | null
}

export default function DashboardClient({
  profile,
  channelSections,
  allChannels,
  initialHomeAnnouncement,
}: DashboardClientProps) {
  const {
    sections,
    handlePostCreated,
    handlePostDeleted,
    handlePostLikeChange,
    handlePostUpdated,
    handlePostCommentChange,
    handleChannelAnnouncementChange,
    handlePostChannelMoved,
    handleRealtimePost,
    pendingNewPostsCount,
    flushPendingPosts,
    dismissPendingPosts,
  } = useHomeFeedState({ profile, channelSections, allChannels })

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

  // Lifted home announcement state (kept here so Realtime can update it)
  const [homeAnnouncement, setHomeAnnouncement] = useState(initialHomeAnnouncement)
  const [homePopupTrigger, setHomePopupTrigger] = useState(0)

  const homeChannel = useMemo(() => allChannels.find(c => c.slug === 'home'), [allChannels])
  const trackedChannelIds = useMemo(() => sections.map(s => s.channel.id), [sections])

  useAnnouncementRealtime({
    homeChannelId: homeChannel?.id,
    trackedChannelIds,
    profileId: profile?.id,
    onHomeAnnouncementChange: setHomeAnnouncement,
    onChannelAnnouncementChange: handleChannelAnnouncementChange,
    onNewHomeAnnouncement: (a) => {
      showToast({
        message: `📢 ${a.title}`,
        type: 'info',
        duration: 8000,
        action: { label: 'View', onClick: () => setHomePopupTrigger(t => t + 1) },
      })
    },
  })

  useHomePostRealtime({
    trackedChannelIds,
    currentUserId: profile?.id,
    onPostUpserted: handleRealtimePost,
    onPostDeleted: handlePostDeleted,
  })

  // Live comment counts on feed cards — increment when a new comment arrives
  // for any post currently visible in the home feed.
  const sectionsRef = useRef(sections)
  sectionsRef.current = sections
  const allPostIds = useMemo(() => sections.flatMap(s => s.posts.map(p => p.id)), [sections])

  useCommentCountRealtime({
    postIds: allPostIds,
    currentUserId: profile?.id,
    onCommentInserted: (postId) => {
      const post = sectionsRef.current.flatMap(s => s.posts).find(p => p.id === postId)
      if (post) handlePostCommentChange(postId, (post.comment_count ?? 0) + 1)
    },
  })

  const onPostUpdated = (updatedPost: Post) => {
    handlePostUpdated(updatedPost)
    setEditingPostId(null)
    if (updatedPost._pendingEdit) {
      showToast({ message: '✏️ Edit submitted — awaiting admin review', type: 'info', duration: 5000 })
    }
  }

  const allPosts = sections.flatMap(s => s.posts)
  const editingPost = allPosts.find(post => post.id === editingPostId)
  const editingChannel = allChannels.find(channel => channel.id === editingPost?.channel_id)
  const previewPost = allPosts.find(p => p.id === previewEditPostId)

  return (
    <>
      <NewPostsBubble
        count={pendingNewPostsCount}
        onLoad={flushPendingPosts}
        onDismiss={dismissPendingPosts}
      />

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

      <div className="mx-auto w-full max-w-2xl space-y-6">
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
          announcement={homeAnnouncement}
          onAnnouncementChange={setHomeAnnouncement}
          profileId={profile?.id}
          isAdmin={profile?.role === 'Admin'}
          isAgreementOpen={agreementState.isOpen}
          popupTrigger={homePopupTrigger}
        />

        <div className="space-y-10">
          {sections.length > 0 ? (
            sections.map(({ channel, posts, announcement }) => (
              <div key={channel.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-page-heading-text flex items-center gap-2">
                    <ChannelIcon slug={channel.slug} size={20} aria-hidden="true" />
                    <span>Latest from {channel.name}</span>
                  </h2>
                  <Link
                    href={`/dashboard/channels/${channel.slug}`}
                    className="text-sm font-medium text-primary hover:underline underline-offset-4"
                  >
                    See all →
                  </Link>
                </div>

                {announcement && (
                  <ChannelAnnouncementBanner
                    announcement={announcement}
                    onExpire={() => handleChannelAnnouncementChange(channel.id, null)}
                  />
                )}

                <div className="-mx-4 sm:mx-0 divide-y divide-border sm:divide-y-0 sm:space-y-4">
                  {posts.map((post: FeedPost) => (
                    <Card key={post.id} className="rounded-none border-0 shadow-none sm:rounded-lg sm:border sm:shadow-sm sm:hover:shadow-md transition-shadow overflow-hidden">
                      <CardHeader className="p-3 sm:p-6">
                        <PostCardHeader
                          post={post}
                          isAdmin={profile?.role === 'Admin'}
                          channels={allChannels}
                          currentUserId={profile?.id}
                          onPostDeleted={handlePostDeleted}
                          onChannelUpdated={(channelId) => handlePostChannelMoved(post.id, channelId)}
                          onEditClick={post.approval_status === 'pending_edit' && post.author_id === profile?.id ? undefined : () => setEditingPostId(post.id)}
                          onProfileClick={setSelectedUserId}
                          onViewPendingEdit={post.approval_status === 'pending_edit' && post.author_id === profile?.id && post.pending_edit ? () => setPreviewEditPostId(post.id) : undefined}
                        />
                      </CardHeader>
                      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-0 pt-0">
                        <h3 className="text-xl font-bold text-card-header-text">{post.title}</h3>
                        <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {post.content.length > 300 ? `${post.content.substring(0, 300)}...` : post.content}
                        </p>
                        {post.post_contact && post.post_contact.length > 0 && (
                          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
                            {post.post_contact.map((entry: { label: string; value: string }, i: number) => (
                              <p key={i} className="text-sm">
                                <span className="font-medium text-foreground">{entry.label}:</span>{' '}
                                <span className="text-muted-foreground break-all">{entry.value}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {post.images && post.images.length > 0 && (
                          <div className="-mx-6 mt-3">
                            <PostImageGrid images={post.images} postTitle={post.title} className="overflow-hidden" />
                          </div>
                        )}
                        <div className="flex items-center justify-between space-x-4 py-2 sm:py-4 border-t">
                          <div className="flex items-center space-x-4">
                            <PostLikeButton
                              postId={post.id}
                              likeCount={post.like_count || 0}
                              userHasLiked={post.user_has_liked || false}
                              likeId={post.like_id || null}
                              onLikeChange={(newCount, newLikeStatus) =>
                                handlePostLikeChange(post.id, newCount, newLikeStatus)
                              }
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
                  ))}
                </div>
              </div>
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
