'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentsSection from '@/components/CommentsSection'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trash2 } from 'lucide-react'
import type { Post, Profile } from '@/lib/types'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const supabase = createClient()

  const [post, setPost] = useState<Post | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadPost = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }

        // Fetch post
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

        // Get like count
        const { count: like_count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)

        // Check if current user liked
        let user_has_liked = false
        if (user) {
          const { data: userLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle()
          user_has_liked = !!userLike
        }

        setPost({
          ...postData,
          like_count: like_count || 0,
          user_has_liked,
        })
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [postId, supabase])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) {
        throw error
      }

      router.push('/dashboard')
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
            <Link href="/dashboard">
              <Button>Go Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="outline" size="sm">
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Post Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
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

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  <p className="font-semibold text-card-header-text">
                    {post.author?.full_name}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role || 'Personal')}`}>
                    {post.author?.role}
                  </span>
                </div>
                <p className="text-sm text-card-subtext">
                  {formatRelativeTime(post.created_at)}
                </p>
              </div>
            </div>

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
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-card-header-text mb-4">
              {post.title}
            </h1>
            <p className="text-card-subtext whitespace-pre-wrap">
              {post.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 pt-4 border-t">
            <PostLikeButton
              postId={post.id}
              likeCount={post.like_count || 0}
              userHasLiked={post.user_has_liked || false}
            />
            <span className="text-sm text-card-subtext">
              👁️ {post.view_count} views
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <CommentsSection postId={post.id} currentUserId={currentUserId} />
    </div>
  )
}
