'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import PostLikeButton from '@/components/PostLikeButton'
import CommentCountButton from '@/components/CommentCountButton'
import PostCardHeader from '@/components/PostCardHeader'
import { PostImageGrid } from '@/components/PostImageGrid'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'
import { NewPostsBubble } from '@/components/NewPostsBubble'
import CreatePostModal from '@/components/CreatePostModal'
import EditPostModal from '@/components/EditPostModal'
import PostDetailModal from '@/components/PostDetailModal'
import UserProfileModal from '@/components/UserProfileModal'
import ChannelAnnouncementModal from '@/components/ChannelAnnouncementModal'
import AnnouncementCard from '@/components/AnnouncementCard'
import UserAvatar from '@/components/UserAvatar'
import { useChannelFeedState } from '@/lib/hooks/useChannelFeedState'
import { formatRelativeTime } from '@/lib/utils'
import ChannelIcon from '@/components/ChannelIcon'
import { useToast } from '@/components/ui/toast'
import type { Profile, Post, Channel, ChannelAnnouncement } from '@/lib/types'

function ChannelLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 animate-pulse">
      {/* Header Card */}
      <div className="rounded-lg border bg-card">
        <div className="bg-muted p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 rounded bg-muted-foreground/20" />
              <div className="h-4 w-96 rounded bg-muted-foreground/20" />
            </div>
          </div>
        </div>
        <div className="p-6 border-t">
          <div className="h-10 w-40 rounded bg-muted" />
        </div>
      </div>

      {/* Announcement Card */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          </div>
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-6 w-3/5 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-56 rounded bg-muted" />
                </div>
              </div>
              <div className="h-8 w-8 rounded bg-muted" />
            </div>

            <div className="h-6 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <div className="h-5 w-8 rounded bg-muted" />
                <div className="h-5 w-8 rounded bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
              </div>
              <div className="h-8 w-28 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChannelPage() {
  const params = useParams()
  const rawSlug = params.slug as string
  const canonicalSlug = useMemo(() => {
    const slugAliases: Record<string, string> = {
      'aggie-ring': 'fundraising',
      'tickets': 'football-tickets',
      'jobs': 'jobs-networking',
    }
    return slugAliases[rawSlug] ?? rawSlug
  }, [rawSlug])
  const {
    channel,
    setChannel,
    channelAnnouncement,
    setChannelAnnouncement,
    posts,
    setPosts,
    channels,
    loading,
    currentUserRole,
    currentUserId,
    currentUserProfile,
    postOffset,
    setPostOffset,
    hasMorePosts,
    isLoadingMore,
    loadMoreTriggerRef,
    pendingNewPostsCount,
    flushPendingPosts,
    dismissPendingPosts,
  } = useChannelFeedState({
    rawSlug,
    canonicalSlug,
    onRealtimeAnnouncement: (a) => {
      showToast({
        message: `📢 ${a.title}`,
        type: 'info',
        duration: 8000,
        action: { label: 'View', onClick: () => setAnnouncementPopupTrigger(t => t + 1) },
      })
    },
  })
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [announcementEditorOpen, setAnnouncementEditorOpen] = useState(false)
  const [announcementPopupOpen, setAnnouncementPopupOpen] = useState(false)
  const [announcementPopupTrigger, setAnnouncementPopupTrigger] = useState(0)
  const [previewEditPostId, setPreviewEditPostId] = useState<string | null>(null)
  const { showToast, ToastContainer } = useToast()

  const markAnnouncementSeen = (updatedAt: string) => {
    if (!channel?.id || typeof window === 'undefined') {
      return
    }

    const seenKey = `channel-announcement-seen:${channel.id}`
    window.localStorage.setItem(seenKey, updatedAt)
  }

  useEffect(() => {
    if (!channel?.id || !channelAnnouncement?.updated_at) {
      setAnnouncementPopupOpen(false)
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const seenKey = `channel-announcement-seen:${channel.id}`
    const seenVersion = window.localStorage.getItem(seenKey)

    if (seenVersion !== channelAnnouncement.updated_at) {
      setAnnouncementPopupOpen(true)
    }
  }, [channel?.id, channelAnnouncement?.updated_at])

  useEffect(() => {
    if (announcementPopupTrigger > 0) setAnnouncementPopupOpen(true)
  }, [announcementPopupTrigger])

  const dismissAnnouncementPopup = () => {
    if (channelAnnouncement?.updated_at) {
      markAnnouncementSeen(channelAnnouncement.updated_at)
    }

    setAnnouncementPopupOpen(false)
  }

  if (loading) {
    return <ChannelLoadingSkeleton />
  }

  if (!channel) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Channel Not Found</h1>
          <p className="text-muted-foreground mb-6">The channel you're looking for doesn't exist.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <NewPostsBubble
      count={pendingNewPostsCount}
      onLoad={flushPendingPosts}
      onDismiss={dismissPendingPosts}
    />
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="bg-dash-header-bg text-dash-header-text">
          <div className="flex items-center space-x-3">
            <ChannelIcon slug={channel.slug} size={28} />
            <div>
              <h1 className="text-2xl font-bold text-dash-header-text">{channel.name}</h1>
              <p className="text-dash-header-text/80">{channel.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {!channel.is_read_only && (
              <Button size="lg" onClick={() => setCreatePostOpen(true)}>
                Create New Post
              </Button>
            )}
            {currentUserRole === 'Admin' && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setAnnouncementEditorOpen(true)}
              >
                {channelAnnouncement ? 'Edit Announcement' : 'Post Announcement'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {channelAnnouncement && (
        <>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold text-page-heading-text">Announcement</h2>
          </div>
          <AnnouncementCard
            announcement={channelAnnouncement}
            isAdmin={currentUserRole === 'Admin'}
            onEditClick={() => setAnnouncementEditorOpen(true)}
            onExpire={() => setChannelAnnouncement(null)}
          />
        </>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <CardHeader>
                <PostCardHeader
                  post={post}
                  isAdmin={currentUserRole === 'Admin'}
                  channels={channels}
                  currentUserId={currentUserId}
                  onPostDeleted={(postId) => {
                    setPosts(current => current.filter(item => item.id !== postId))
                    setPostOffset(current => Math.max(current - 1, 0))
                  }}
                  onChannelUpdated={() => {
                    setPosts(current => current.filter(item => item.id !== post.id))
                    setPostOffset(current => Math.max(current - 1, 0))
                  }}
                  onEditClick={post.approval_status === 'pending_edit' && post.author_id === currentUserId ? undefined : () => setEditingPostId(post.id)}
                  onProfileClick={setSelectedUserId}
                  onViewPendingEdit={post.approval_status === 'pending_edit' && post.author_id === currentUserId && post.pending_edit ? () => setPreviewEditPostId(post.id) : undefined}
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

                {post.post_contact && post.post_contact.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
                    {(post.post_contact as { label: string; value: string }[]).map((entry, i) => (
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

                <div className="flex items-center justify-between space-x-4 py-4 border-t">
                  <div className="flex items-center space-x-4">
                    <PostLikeButton
                      postId={post.id}
                      likeCount={post.like_count || 0}
                      userHasLiked={post.user_has_liked || false}
                      likeId={post.like_id || null}
                      onLikeChange={(newCount, newLikeStatus) =>
                        setPosts(current => current.map(p =>
                          p.id === post.id
                            ? { ...p, like_count: newCount, user_has_liked: newLikeStatus }
                            : p
                        ))
                      }
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
                No posts in this channel yet. Be the first to share something!
              </p>
              {!channel.is_read_only && (
                <Button onClick={() => setCreatePostOpen(true)}>Create First Post</Button>
              )}
            </CardContent>
          </Card>
        )}

        {posts && posts.length > 0 && (
          <div ref={loadMoreTriggerRef} className="py-4 text-center">
            {isLoadingMore && (
              <p className="text-sm text-muted-foreground">Loading more posts...</p>
            )}
            {!hasMorePosts && (
              <p className="text-sm text-muted-foreground">You&apos;ve reached the end of this channel.</p>
            )}
          </div>
        )}
      </div>

      {!channel.is_read_only && (
        <FloatingCreatePostButton onClick={() => setCreatePostOpen(true)} />
      )}

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        initialChannelSlug={channel.slug}
        onPostCreated={(newPost: Post, resolvedChannel: Channel | null) => {
          const isApproved = newPost.approval_status === 'approved' || newPost.is_moderated === true
          if (!isApproved) {
            return
          }

          const hydratedPost = {
            ...newPost,
            author: currentUserProfile || undefined,
            channel: resolvedChannel || channel,
            like_count: 0,
            comment_count: 0,
            user_has_liked: false,
            like_id: null,
            // view_count removed
          }
          setPosts(current => [hydratedPost, ...current])
          setPostOffset(current => current + 1)
        }}
      />

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
        onPostDeleted={(postId) => {
          setPosts(current => current.filter(item => item.id !== postId))
          setPostOffset(current => Math.max(current - 1, 0))
        }}
        onPostLikeChange={(postId, likeCount, userHasLiked) => {
          setPosts(current =>
            current.map(item =>
              item.id === postId
                ? {
                    ...item,
                    like_count: likeCount,
                    user_has_liked: userHasLiked,
                  }
                : item
            )
          )
        }}
        onPostCommentChange={(postId, commentCount) => {
          setPosts(current =>
            current.map(item =>
              item.id === postId
                ? {
                    ...item,
                    comment_count: commentCount,
                  }
                : item
            )
          )
        }}
      />

      {editingPostId && (
        <EditPostModal
          isOpen={!!editingPostId}
          onClose={() => setEditingPostId(null)}
          post={posts.find(item => item.id === editingPostId) as Post}
          channel={channels.find(item => item.id === posts.find(post => post.id === editingPostId)?.channel_id)}
          onPostUpdated={(updatedPost) => {
            setPosts(current => current.map(item => item.id === updatedPost.id ? { ...item, ...updatedPost } : item))
            setEditingPostId(null)
            if (updatedPost._pendingEdit) {
              showToast({ message: '✏️ Edit submitted — awaiting admin review', type: 'info', duration: 5000 })
            }
          }}
        />
      )}

      <ChannelAnnouncementModal
        isOpen={announcementEditorOpen}
        channelSlug={channel.slug}
        initialAnnouncement={channelAnnouncement}
        onClose={() => setAnnouncementEditorOpen(false)}
        onSaved={(announcement) => {
          markAnnouncementSeen(announcement.updated_at)
          setChannelAnnouncement(announcement)
          setAnnouncementPopupOpen(false)
        }}
        onDeleted={() => {
          setChannelAnnouncement(null)
          setAnnouncementPopupOpen(false)
        }}
      />

      <Modal
        isOpen={announcementPopupOpen}
        onClose={dismissAnnouncementPopup}
        title={`${channel.name} Announcement`}
        headerExtra={channelAnnouncement?.updated_by_profile ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1">
            <UserAvatar user={channelAnnouncement.updated_by_profile} size="sm" linkToProfile={false} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-card-header-text truncate leading-tight">
                {channelAnnouncement.updated_by_profile.full_name}
              </p>
              <p className="text-[11px] text-card-subtext leading-tight">Admin</p>
            </div>
          </div>
        ) : undefined}
        size="md"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-card-header-text">
            {channelAnnouncement?.title}
          </h2>
          <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {channelAnnouncement?.content}
          </p>
          <div className="flex justify-end">
            <Button onClick={dismissAnnouncementPopup}>Close</Button>
          </div>
        </div>
      </Modal>

      <UserProfileModal
        isOpen={selectedUserId !== null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      {(() => {
        const previewPost = posts.find(p => p.id === previewEditPostId)
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
    </div>
    </>
  )
}
