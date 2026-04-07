'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentsSection from '@/components/CommentsSection'
import PostAdminMenu from '@/components/PostAdminMenu'
import { PostImageGrid } from '@/components/PostImageGrid'
import ChannelIcon from '@/components/ChannelIcon'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trash2 } from 'lucide-react'
import type { FeedAuthorDTO, Post, Channel } from '@/lib/types'

interface PostDetailPanelProps {
  postId: string
  showBackButton?: boolean
  onClose?: () => void
  onPostDeleted?: (postId: string) => void
  onProfileClick?: (userId: string) => void
  onPostLikeChange?: (postId: string, likeCount: number, userHasLiked: boolean) => void
  onPostCommentChange?: (postId: string, commentCount: number) => void
  onTitleChange?: (title: string) => void
}

export default function PostDetailPanel({
  postId,
  showBackButton = false,
  onClose,
  onPostDeleted,
  onProfileClick,
  onPostLikeChange,
  onPostCommentChange,
  onTitleChange,
}: PostDetailPanelProps) {
  const router = useRouter()
  const supabase = createClient()

  const [post, setPost] = useState<Post | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentUserProfile, setCurrentUserProfile] = useState<FeedAuthorDTO | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadPost = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role, full_name, avatar_url')
            .eq('id', user.id)
            .single()

          if (profile) {
            setCurrentUserRole(profile.role)
            setCurrentUserProfile({
              id: profile.id,
              role: profile.role,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            })
          }
        }

        const { data: postData, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!posts_author_id_fkey(*)
          `)
          .eq('id', postId)
          .single()

        if (error) {
          console.error('Error loading post:', error)
          setPost(null)
          return
        }

        if (!postData.is_moderated) {
          setPost(null)
          return
        }

        const { data: channelsData } = await supabase
          .from('channels')
          .select('*')
          .order('name')

        if (channelsData) {
          setChannels(channelsData)
        }

        const { count: like_count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)

        const { count: comment_count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)

        let user_has_liked = false
        let like_id: string | null = null
        if (user) {
          const { data: userLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle()
          user_has_liked = !!userLike
          like_id = userLike?.id ?? null
        }

        setPost({
          ...postData,
          like_count: like_count || 0,
          comment_count: comment_count || 0,
          user_has_liked,
          like_id,
        })
        onTitleChange?.(`${postData.author?.full_name ?? 'Unknown'}'s Post`)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [postId, supabase])

  const handleChannelUpdated = (newChannelId: string) => {
    setPost((current) => current ? { ...current, channel_id: newChannelId } : current)
  }

  const handlePostDeleted = (deletedPostId: string) => {
    onPostDeleted?.(deletedPostId)

    if (onClose) {
      onClose()
      return
    }

    router.push('/dashboard')
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete post')
      }

      handlePostDeleted(postId)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Post Not Found</h1>
            {onClose ? (
              <Button onClick={onClose}>Close</Button>
            ) : (
              <Link href="/dashboard">
                <Button>Go Back to Dashboard</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Shared sub-sections ──────────────────────────────────────────────────────

  const postChannel = channels.find((c) => c.id === post.channel_id)

  const authorRow = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-3 min-w-0">
        {/* Avatar */}
        {post.author?.avatar_url ? (
          <div className="relative h-10 w-10 overflow-hidden rounded-full flex-shrink-0">
            <Image
              src={post.author.avatar_url}
              alt={`${post.author?.full_name} avatar`}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0">
            {getInitials(post.author?.full_name || 'Unknown')}
          </div>
        )}

        {/* Name + badges + metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-card-header-text text-sm sm:text-base leading-tight">
              {post.author?.full_name}
            </p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${getRoleBadgeColor(post.author?.role || 'Personal')}`}>
              {post.author?.role}
            </span>
            {(post.author as any)?.flair && (
              <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0 bg-muted text-muted-foreground border border-border">
                {(post.author as any).flair}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground mt-0.5">
            <span className="shrink-0">{formatRelativeTime(post.created_at)}</span>
            {postChannel && (
              <>
                <span className="text-muted-foreground/40 select-none shrink-0">·</span>
                <span className="flex items-center gap-0.5 font-medium text-brand-maroon dark:text-slate-400 shrink-0">
                  <ChannelIcon slug={postChannel.slug} size={11} />
                  <span className="truncate max-w-[140px]">{postChannel.name}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {currentUserId === post.author_id && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 size={16} />
          </Button>
        )}
        {currentUserRole === 'Admin' && (
          <PostAdminMenu
            postId={post.id}
            postChannelId={post.channel_id}
            isAdmin={true}
            channels={channels}
            onPostDeleted={handlePostDeleted}
            onChannelUpdated={handleChannelUpdated}
          />
        )}
      </div>
    </div>
  )

  const likeButton = (
    <PostLikeButton
      postId={post.id}
      likeCount={post.like_count || 0}
      userHasLiked={post.user_has_liked || false}
      likeId={post.like_id || null}
      onLikeChange={(newCount, newLikeStatus) => {
        setPost((currentPost) => {
          if (!currentPost) return currentPost
          return { ...currentPost, like_count: newCount, user_has_liked: newLikeStatus }
        })
        onPostLikeChange?.(post.id, newCount, newLikeStatus)
      }}
    />
  )

  // ── Standalone page layout (with back button) — keeps Card wrapper ──────────
  if (showBackButton) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>{authorRow}</CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-card-header-text mb-4">{post.title}</h1>
              <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {post.content}
              </p>
            </div>
            {post.images && post.images.length > 0 && (
              <PostImageGrid images={post.images} postTitle={post.title} />
            )}
            <div className="flex items-center justify-between pt-4 border-t">
              {likeButton}
              <span className="font-semibold text-base text-foreground">
                Comments ({post.comment_count ?? 0})
              </span>
            </div>
          </CardContent>
        </Card>

        <CommentsSection
          postId={post.id}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          currentUserProfile={currentUserProfile}
          onProfileClick={onProfileClick}
          hideHeader
          onCommentCountChange={(newCount) => {
            setPost((currentPost) => {
              if (!currentPost) return currentPost
              return { ...currentPost, comment_count: newCount }
            })
            onPostCommentChange?.(post.id, newCount)
          }}
        />

      </div>
    )
  }

  // ── Modal layout — flat, no Card, fills the modal ─────────────────────────
  // The scroll container has no padding (contentClassName=""), so we manage
  // padding in sections here. Images sit between sections to go edge-to-edge.
  return (
    <>
      {/* Top padded section: author + post text */}
      <div className="px-6 pt-6 space-y-4">
        {authorRow}
        <div>
          <h1 className="text-2xl font-bold text-card-header-text mb-2">{post.title}</h1>
          <p className="text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {post.content}
          </p>
        </div>
      </div>

      {/* Contact info */}
      {post.post_contact && post.post_contact.length > 0 && (
        <div className="px-6 pt-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
            {post.post_contact.map((entry: { label: string; value: string }, i: number) => (
              <p key={i} className="text-sm">
                <span className="font-medium text-foreground">{entry.label}:</span>{' '}
                <span className="text-muted-foreground break-all">{entry.value}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Full-bleed image — no horizontal padding */}
      {post.images && post.images.length > 0 && (
        <PostImageGrid images={post.images} postTitle={post.title} />
      )}

      {/* Bottom padded section: likes, comments, history */}
      <div className="px-6 pt-4 space-y-4">
        <div className="flex items-center justify-between border-t border-border pt-1">
          {likeButton}
          <span className="font-semibold text-base text-foreground">
            Comments ({post.comment_count ?? 0})
          </span>
        </div>

        <CommentsSection
          postId={post.id}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          currentUserProfile={currentUserProfile}
          onProfileClick={onProfileClick}
          hideHeader
          onCommentCountChange={(newCount) => {
            setPost((currentPost) => {
              if (!currentPost) return currentPost
              return { ...currentPost, comment_count: newCount }
            })
            onPostCommentChange?.(post.id, newCount)
          }}
        />

      </div>
    </>
  )
}
