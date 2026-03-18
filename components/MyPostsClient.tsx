'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CommentCountButton from '@/components/CommentCountButton'
import PostLikeButton from '@/components/PostLikeButton'
import PostCardHeader from '@/components/PostCardHeader'
import CreatePostModal from '@/components/CreatePostModal'
import EditPostModal from '@/components/EditPostModal'
import PostDetailModal from '@/components/PostDetailModal'
import Modal from '@/components/Modal'
import { useToast } from '@/components/ui/toast'
import type { ChannelListDTO, FeedPost, Post, Profile } from '@/lib/types'

interface MyPostsClientProps {
  profile: Profile
  posts: FeedPost[]
  channels: ChannelListDTO[]
}

export default function MyPostsClient({
  profile,
  posts,
  channels,
}: MyPostsClientProps) {
  const [postsState, setPostsState] = useState<FeedPost[]>(posts)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [previewEditPostId, setPreviewEditPostId] = useState<string | null>(null)
  const { showToast, ToastContainer } = useToast()

  const handlePostCreated = (newPost: Post, channel: ChannelListDTO | null) => {
    const resolvedChannel = channel || channels.find(c => c.id === newPost.channel_id) || undefined
    const hydratedPost: FeedPost = {
      ...newPost,
      author: profile,
      channel: resolvedChannel,
      like_count: 0,
      comment_count: 0,
      user_has_liked: false,
      like_id: null,
    }

    setPostsState(current => [hydratedPost, ...current])
  }

  const handlePostDeleted = (postId: string) => {
    setPostsState(current => current.filter(post => post.id !== postId))
  }

  const handlePostUpdated = (updatedPost: Post) => {
    const hydratedPost: FeedPost = {
      ...updatedPost,
      author: updatedPost.author || profile,
      channel: updatedPost.channel,
      like_count: updatedPost.like_count,
      comment_count: updatedPost.comment_count,
      user_has_liked: false,
      like_id: null,
    }

    setPostsState(current =>
      current.map(post => post.id === updatedPost.id ? hydratedPost : post)
    )
    setEditingPostId(null)
    if (updatedPost._pendingEdit) {
      showToast({ message: '✏️ Edit submitted — awaiting admin review', type: 'info', duration: 5000 })
    }
  }

  const editingPost = postsState.find(post => post.id === editingPostId)
  const editingChannel = channels.find(channel => channel.id === editingPost?.channel_id)

  const getApprovalBadge = (approvalStatus?: string) => {
    if (approvalStatus === 'approved') {
      return {
        label: '✅ Approved',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      }
    }

    if (approvalStatus === 'rejected') {
      return {
        label: '❌ Rejected',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      }
    }

    if (approvalStatus === 'pending_edit') {
      return {
        label: '✏️ Edit Pending Review',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      }
    }

    return {
      label: '⏳ Pending Approval',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="bg-dash-header-bg text-dash-header-text">
            <CardTitle className="text-2xl text-dash-header-text">My Posts</CardTitle>
            <CardDescription className="text-dash-header-text/80">
              Track your post status (pending, approved, or rejected)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => setCreatePostOpen(true)}>
                Create New Post
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {postsState && postsState.length > 0 ? (
            postsState.map((post: FeedPost) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  {(() => {
                    const badge = getApprovalBadge(post.approval_status)
                    return (
                      <div className="mb-2 space-y-1">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${badge.className}`}>
                          {badge.label}
                        </span>
                        {post.approval_status === 'pending_edit' && (
                          <p className="text-xs text-muted-foreground">
                            Your edit is awaiting admin review. The original post remains visible until approved.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                  <PostCardHeader
                    post={post}
                    isAdmin={profile?.role === 'Admin'}
                    channels={channels}
                    currentUserId={profile?.id}
                    onPostDeleted={handlePostDeleted}
                    onEditClick={post.approval_status === 'pending_edit' ? undefined : () => setEditingPostId(post.id)}
                    onViewPendingEdit={post.approval_status === 'pending_edit' && post.pending_edit ? () => setPreviewEditPostId(post.id) : undefined}
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

                  {post.approval_status === 'rejected' && post.moderation_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Rejection reason: {post.moderation_reason}
                    </p>
                  )}

                  <div className="flex items-center justify-between space-x-4 py-4 border-t">
                    <div className="flex items-center space-x-4">
                      <PostLikeButton
                        postId={post.id}
                        likeCount={post.like_count || 0}
                        userHasLiked={post.user_has_liked || false}
                        likeId={post.like_id || null}
                      />
                      {post.approval_status === 'approved' && (
                        <CommentCountButton
                          postId={post.id}
                          commentCount={post.comment_count || 0}
                          onOpenPost={() => setActivePostId(post.id)}
                        />
                      )}
                    </div>
                    {post.approval_status === 'approved' && (
                      <Button variant="outline" size="sm" onClick={() => setActivePostId(post.id)}>
                        View Full Post
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  You haven't created any posts yet. Share something with the community!
                </p>
                <Button onClick={() => setCreatePostOpen(true)}>
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
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
        onPostCommentChange={(postId, commentCount) => {
          setPostsState(current =>
            current.map(post =>
              post.id === postId
                ? {
                    ...post,
                    comment_count: commentCount,
                  }
                : post
            )
          )
        }}
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
